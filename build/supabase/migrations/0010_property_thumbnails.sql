-- ============================================================================
-- Migration 0010: Property thumbnails for the 10 lighter properties
-- ============================================================================
-- The 10 "lighter" properties seeded in seed_properties.sql never got an
-- image_url. The dashboard property cards render a thumbnail only when this
-- field is non-null, so those cards looked text-only. This migration sets a
-- distinct, residential-real-estate-appropriate Unsplash photo for each.
--
-- All URLs are Unsplash CDN photos with no auth required and a wide max-width
-- variant. Free for commercial use under the Unsplash license.
--
-- Also normalises "Test Tower" if it exists (leftover from a dev test insert).
-- ============================================================================

-- 1. Trident Towers (M3M, Gurugram premium tower)
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200',
                      updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111106';

-- 2. Riverdale Park (Mahindra Lifespaces, Mahalunge Pune)
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200',
                      updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111107';

-- 3. Marina Bay (Hiranandani Powai — lake-view towers)
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
                      updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111108';

-- 4. Hebbal Greens (Sobha, Bangalore tech-park adjacent)
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200',
                      updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111109';

-- 5. Sarjapur Heights (Brigade, Bangalore ORR)
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
                      updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111110';

-- 6. Wagholi Springs (Kohinoor, affordable Pune)
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200',
                      updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 7. Andheri Crest (Oberoi, Mumbai high-rise)
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200',
                      updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111112';

-- 8. Faridabad Greens (Puri, NCR upcoming)
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=1200',
                      updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111113';

-- 9. Electronic City Pulse (Puravankara, Bangalore affordable)
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
                      updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111114';

-- 10. Hinjewadi Vista (Paranjape, Pune IT corridor)
UPDATE properties SET image_url = 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1200',
                      updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111115';

-- Test Tower: leftover demo row. Either give it a thumbnail or mark inactive.
-- We mark it inactive to keep the catalog clean and prevent it showing in
-- /properties OR being suggested by the Lead Agent RAG retrieval.
UPDATE properties SET
  status = 'Sold Out',
  image_url = COALESCE(image_url, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200'),
  updated_at = now()
WHERE project_name = 'Test Tower';

-- =========================================================================
-- Verify
-- =========================================================================
-- All 25 active properties should now have a non-null image_url:
-- SELECT count(*) AS active_without_image
--   FROM properties
--  WHERE status = 'Active' AND (image_url IS NULL OR image_url = '');
-- Expect 0.
