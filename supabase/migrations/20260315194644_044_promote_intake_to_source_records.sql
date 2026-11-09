
-- ============================================================
-- Migration 044: Promotion function surplus_intake_v1 â source_records
-- Promotes validated intake records into the source_records pipeline
-- Rules:
--   - Record must not already be promoted
--   - Source must exist in sources table by parser_key match on source_name
--   - Generates source_url_hash and payload_hash
--   - Deduplicates by external_id (per source) or url_hash (if no external_id)
--   - Sets promoted = true, promoted_at, promoted_to_id on success
--   - Returns a summary JSONB of what was promoted vs skipped vs failed
-- ============================================================

CREATE OR REPLACE FUNCTION promote_intake_to_source_records(
  p_intake_ids uuid[] DEFAULT NULL  -- NULL = promote all unpromoted records
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record       surplus_intake_v1%ROWTYPE;
  v_source_id    uuid;
  v_new_sr_id    uuid;
  v_url_hash     text;
  v_payload_hash text;
  v_existing_id  uuid;

  v_promoted     int := 0;
  v_skipped      int := 0;
  v_failed       int := 0;
  v_skipped_reasons jsonb := '[]'::jsonb;
  v_failed_reasons  jsonb := '[]'::jsonb;

  v_intake_cursor CURSOR FOR
    SELECT * FROM surplus_intake_v1
    WHERE promoted = false
      AND (p_intake_ids IS NULL OR id = ANY(p_intake_ids))
    ORDER BY collected_at ASC;
BEGIN

  OPEN v_intake_cursor;

  LOOP
    FETCH v_intake_cursor INTO v_record;
    EXIT WHEN NOT FOUND;

    -- ââ Gate 1: title and listing_url must be present (schema enforces NOT NULL but double-check)
    IF v_record.listing_url IS NULL OR trim(v_record.listing_url) = '' THEN
      v_skipped := v_skipped + 1;
      v_skipped_reasons := v_skipped_reasons || jsonb_build_object(
        'id', v_record.id, 'reason', 'missing listing_url'
      );
      CONTINUE;
    END IF;

    IF v_record.title IS NULL OR trim(v_record.title) = '' THEN
      v_skipped := v_skipped + 1;
      v_skipped_reasons := v_skipped_reasons || jsonb_build_object(
        'id', v_record.id, 'reason', 'missing title'
      );
      CONTINUE;
    END IF;

    -- ââ Gate 2: Resolve source_id from sources table via parser_key = source_name
    SELECT id INTO v_source_id
    FROM sources
    WHERE parser_key = v_record.source_name
    LIMIT 1;

    IF v_source_id IS NULL THEN
      v_skipped := v_skipped + 1;
      v_skipped_reasons := v_skipped_reasons || jsonb_build_object(
        'id', v_record.id,
        'reason', 'no matching source for source_name: ' || coalesce(v_record.source_name, 'null')
      );
      CONTINUE;
    END IF;

    -- ââ Gate 3: Status must be active or upcoming (not closed/awarded)
    IF v_record.status IN ('closed', 'awarded') THEN
      v_skipped := v_skipped + 1;
      v_skipped_reasons := v_skipped_reasons || jsonb_build_object(
        'id', v_record.id, 'reason', 'status is terminal: ' || v_record.status
      );
      CONTINUE;
    END IF;

    -- ââ Compute hashes
    v_url_hash     := encode(digest(lower(trim(v_record.listing_url)), 'sha256'), 'hex');
    v_payload_hash := encode(digest(
      coalesce(v_record.title,'') ||
      coalesce(v_record.external_id,'') ||
      coalesce(v_record.listing_url,'') ||
      coalesce(v_record.status,'') ||
      coalesce(v_record.current_price::text,''),
      'sha256'
    ), 'hex');

    -- ââ Gate 4: Dedup check
    -- If external_id present: check for existing source_record with same source + external_id
    -- If no external_id: check by url_hash
    IF v_record.external_id IS NOT NULL THEN
      SELECT id INTO v_existing_id
      FROM source_records
      WHERE source_id = v_source_id
        AND external_id = v_record.external_id
      LIMIT 1;
    ELSE
      SELECT id INTO v_existing_id
      FROM source_records
      WHERE source_url_hash = v_url_hash
      LIMIT 1;
    END IF;

    IF v_existing_id IS NOT NULL THEN
      -- Already in source_records â mark as promoted to existing record, skip insert
      UPDATE surplus_intake_v1
      SET promoted = true,
          promoted_at = now(),
          promoted_to_id = v_existing_id
      WHERE id = v_record.id;

      v_skipped := v_skipped + 1;
      v_skipped_reasons := v_skipped_reasons || jsonb_build_object(
        'id', v_record.id,
        'reason', 'duplicate â already in source_records as ' || v_existing_id
      );
      CONTINUE;
    END IF;

    -- ââ Insert into source_records
    BEGIN
      INSERT INTO source_records (
        source_id,
        source_run_id,
        external_id,
        source_url,
        source_url_normalized,
        source_url_hash,
        raw_payload,
        payload_hash,
        first_seen_at,
        last_seen_at,
        is_deleted,
        dedup_flag
      )
      VALUES (
        v_source_id,
        NULL,  -- no source_run for manual intake â intake_run_id not yet FK'd to source_runs
        v_record.external_id,
        v_record.listing_url,
        lower(trim(v_record.listing_url)),
        v_url_hash,
        jsonb_build_object(
          'intake_id',       v_record.id,
          'title',           v_record.title,
          'description',     v_record.description,
          'category',        v_record.category,
          'subcategory',     v_record.subcategory,
          'status',          v_record.status,
          'current_price',   v_record.current_price,
          'starting_price',  v_record.starting_price,
          'estimated_value', v_record.estimated_value,
          'currency',        v_record.currency,
          'bid_count',       v_record.bid_count,
          'closes_at',       v_record.closes_at,
          'province_state',  v_record.province_state,
          'city',            v_record.city,
          'asset_type',      v_record.asset_type,
          'brand',           v_record.brand,
          'model',           v_record.model,
          'year',            v_record.year,
          'agency_name',     v_record.agency_name,
          'collector_name',  v_record.collector_name,
          'collection_method', v_record.collection_method,
          'confidence_score',  v_record.confidence_score,
          'notes',           v_record.notes
        ),
        v_payload_hash,
        coalesce(v_record.collected_at, now()),
        coalesce(v_record.last_seen_at, now()),
        false,
        'intake_promoted'
      )
      RETURNING id INTO v_new_sr_id;

      -- Mark intake record as promoted
      UPDATE surplus_intake_v1
      SET promoted      = true,
          promoted_at   = now(),
          promoted_to_id = v_new_sr_id
      WHERE id = v_record.id;

      v_promoted := v_promoted + 1;

    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_failed_reasons := v_failed_reasons || jsonb_build_object(
        'id', v_record.id,
        'reason', SQLERRM
      );
    END;

  END LOOP;

  CLOSE v_intake_cursor;

  RETURN jsonb_build_object(
    'promoted', v_promoted,
    'skipped',  v_skipped,
    'failed',   v_failed,
    'skipped_detail', v_skipped_reasons,
    'failed_detail',  v_failed_reasons,
    'run_at', now()
  );

END;
$$;

-- Grant execute to authenticated (operators) and service_role
GRANT EXECUTE ON FUNCTION promote_intake_to_source_records(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_intake_to_source_records(uuid[]) TO service_role;

COMMENT ON FUNCTION promote_intake_to_source_records IS
'Promotes validated surplus_intake_v1 records into source_records.
Gates: listing_url present, title present, source_name matches sources.parser_key,
status not terminal, dedup by external_id or url_hash.
Returns JSONB summary: promoted / skipped / failed counts + detail.
Call with NULL to promote all unpromoted records, or pass uuid[] for selective promotion.';

