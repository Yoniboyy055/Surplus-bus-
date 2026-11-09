import { LegalDoc, H2 } from "@/components/LegalDoc";
import { OGL_CANADA, OGL_NOVA_SCOTIA } from "@/lib/opendata/attribution";
import { OPEN_DATA_URLS } from "@/lib/opendata/urls";

export const metadata = { title: "Attributions" };

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-[var(--sb-accent-700)]">
    {children}
  </a>
);

export default function AttributionsPage() {
  return (
    <LegalDoc title="Attributions" updated="November 9, 2026">
      <H2>Open data</H2>
      <p>
        {OGL_CANADA.statement} (<A href={OGL_CANADA.url}>{OGL_CANADA.shortName}</A>)
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <A href={OPEN_DATA_URLS.gcsurplusSoldDataset}>GCSurplus — What has sold</A>, Public Services and Procurement Canada.
          Used for sold-price history. Staff contact details in the source are removed before storage.
        </li>
        <li>
          <A href={OPEN_DATA_URLS.canadabuysDataset}>CanadaBuys — tender notices</A>, Public Services and Procurement Canada.
        </li>
      </ul>
      <p>
        {OGL_NOVA_SCOTIA.statement} (<A href={OGL_NOVA_SCOTIA.url}>{OGL_NOVA_SCOTIA.shortName}</A>)
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <A href={OPEN_DATA_URLS.nsPublicTenderPage}>Surplus Crown Property — Purchase and Removal (Public)</A>, Province of Nova Scotia.
        </li>
        <li>
          <A href={OPEN_DATA_URLS.nsRealPropertyPage}>Surplus real property</A>, Province of Nova Scotia.
        </li>
      </ul>
      <p>
        Surplus Bus is not an official Government of Canada or Nova Scotia product, and no endorsement is implied. We change
        the data by cleaning text, grouping similar items and computing price ranges.
      </p>

      <H2>Images</H2>
      <p data-ai-credit>
        The illustrations of a surplus still life, clay price tags, an empty crate and a digest notice, and the social sharing
        image, are <strong>AI-generated illustrations</strong>. They are decorative and do not show real lots, real prices or
        real items for sale.
      </p>
      <p>The Surplus Bus clay price-tag logo is used with permission.</p>

      <H2>Fonts and icons</H2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Bricolage Grotesque, Schibsted Grotesk and JetBrains Mono — SIL Open Font License 1.1 (licence files ship in <code>/fonts</code>).</li>
        <li>Lucide icons — ISC License.</li>
      </ul>
    </LegalDoc>
  );
}
