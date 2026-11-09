ALTER TABLE demo_test ENABLE ROW LEVEL SECURITY; CREATE POLICY "Allow all for anon" ON demo_test FOR ALL USING (true) WITH CHECK (true);
