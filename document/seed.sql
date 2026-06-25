-- ============================================================
-- Seed data — AKH Quán Admin Dashboard
-- Chạy trên Supabase SQL Editor (Project → SQL Editor → New query)
-- Chỉ chạy 1 lần trên database trống
-- ============================================================

DO $$
DECLARE
  -- Product IDs
  p_com_tam        INT;
  p_com_chien      INT;
  p_bun_bo         INT;
  p_pho_bo         INT;
  p_mi_xao         INT;
  p_ga_ran         INT;
  p_cha_ca         INT;
  p_tra_da         INT;
  p_ca_phe         INT;
  p_cam_ep         INT;
  p_sinh_to        INT;
  p_bia_tiger      INT;
  p_bia_heineken   INT;
  p_coca           INT;
  p_pepsi          INT;

  -- Customer IDs
  c1 INT;
  c2 INT;
  c3 INT;

  -- Order IDs
  o1 INT; o2 INT; o3 INT; o4 INT; o5 INT; o6 INT;

BEGIN

  -- ── Sản phẩm ──────────────────────────────────────────────

  INSERT INTO products (name, category, unit, price) VALUES ('Cơm tấm sườn bì', 'mon_an', 'con', 45000) RETURNING id INTO p_com_tam;
  INSERT INTO products (name, category, unit, price) VALUES ('Cơm chiên dương châu', 'mon_an', 'con', 40000) RETURNING id INTO p_com_chien;
  INSERT INTO products (name, category, unit, price) VALUES ('Bún bò Huế', 'mon_an', 'con', 50000) RETURNING id INTO p_bun_bo;
  INSERT INTO products (name, category, unit, price) VALUES ('Phở bò tái chín', 'mon_an', 'con', 55000) RETURNING id INTO p_pho_bo;
  INSERT INTO products (name, category, unit, price) VALUES ('Mì xào hải sản', 'mon_an', 'con', 60000) RETURNING id INTO p_mi_xao;
  INSERT INTO products (name, category, unit, price) VALUES ('Gà rán giòn', 'mon_an', 'con', 35000) RETURNING id INTO p_ga_ran;
  INSERT INTO products (name, category, unit, price) VALUES ('Chả cá thác lác', 'mon_an', 'kg', 120000) RETURNING id INTO p_cha_ca;

  INSERT INTO products (name, category, unit, price) VALUES ('Trà đá', 'mon_nuoc', 'con', 5000) RETURNING id INTO p_tra_da;
  INSERT INTO products (name, category, unit, price) VALUES ('Cà phê sữa đá', 'mon_nuoc', 'con', 25000) RETURNING id INTO p_ca_phe;
  INSERT INTO products (name, category, unit, price) VALUES ('Nước cam ép', 'mon_nuoc', 'con', 30000) RETURNING id INTO p_cam_ep;
  INSERT INTO products (name, category, unit, price) VALUES ('Sinh tố xoài', 'mon_nuoc', 'con', 35000) RETURNING id INTO p_sinh_to;

  INSERT INTO products (name, category, unit, price) VALUES ('Bia Tiger', 'bia_nuoc_ngot', 'con', 20000) RETURNING id INTO p_bia_tiger;
  INSERT INTO products (name, category, unit, price) VALUES ('Bia Heineken', 'bia_nuoc_ngot', 'con', 25000) RETURNING id INTO p_bia_heineken;
  INSERT INTO products (name, category, unit, price) VALUES ('Coca Cola', 'bia_nuoc_ngot', 'con', 15000) RETURNING id INTO p_coca;
  INSERT INTO products (name, category, unit, price) VALUES ('Pepsi', 'bia_nuoc_ngot', 'con', 15000) RETURNING id INTO p_pepsi;

  -- ── Khách hàng ────────────────────────────────────────────

  INSERT INTO customers (name, phone) VALUES ('Nguyễn Văn An', '0901234567') RETURNING id INTO c1;
  INSERT INTO customers (name, phone) VALUES ('Trần Thị Bình', '0912345678') RETURNING id INTO c2;
  INSERT INTO customers (name, phone) VALUES ('Lê Hoàng Nam', '0923456789') RETURNING id INTO c3;

  -- ── Đơn hàng ──────────────────────────────────────────────
  -- Tạo đơn trải đều 7 ngày để biểu đồ dashboard có dữ liệu

  -- Đơn 1 — 7 ngày trước, Đã giao, khách Văn An
  -- 2x Cơm tấm (90k) + 2x Trà đá (10k) + 3x Bia Tiger (60k) = 160k
  INSERT INTO orders (customer_id, total_amount, status, created_at)
    VALUES (c1, 160000, 'da_giao', NOW() - INTERVAL '7 days') RETURNING id INTO o1;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o1, p_com_tam, 2, 45000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o1, p_tra_da, 2, 5000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o1, p_bia_tiger, 3, 20000);

  -- Đơn 2 — 6 ngày trước, Đã giao, khách Thị Bình
  -- 1x Phở bò (55k) + 1x Cà phê (25k) + 2x Heineken (50k) = 130k
  INSERT INTO orders (customer_id, total_amount, status, created_at)
    VALUES (c2, 130000, 'da_giao', NOW() - INTERVAL '6 days') RETURNING id INTO o2;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o2, p_pho_bo, 1, 55000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o2, p_ca_phe, 1, 25000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o2, p_bia_heineken, 2, 25000);

  -- Đơn 3 — 4 ngày trước, Đã giao, khách Hoàng Nam
  -- 3x Bún bò (150k) + 3x Trà đá (15k) + 2x Cam ép (60k) = 225k
  INSERT INTO orders (customer_id, total_amount, status, created_at)
    VALUES (c3, 225000, 'da_giao', NOW() - INTERVAL '4 days') RETURNING id INTO o3;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o3, p_bun_bo, 3, 50000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o3, p_tra_da, 3, 5000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o3, p_cam_ep, 2, 30000);

  -- Đơn 4 — 2 ngày trước, Đã giao, vãng lai (không có khách)
  -- 2x Cơm chiên (80k) + 2x Coca (30k) + 1x Sinh tố (35k) = 145k
  INSERT INTO orders (customer_id, total_amount, status, created_at)
    VALUES (NULL, 145000, 'da_giao', NOW() - INTERVAL '2 days') RETURNING id INTO o4;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o4, p_com_chien, 2, 40000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o4, p_coca, 2, 15000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o4, p_sinh_to, 1, 35000);

  -- Đơn 5 — hôm qua, Đang giao, khách Văn An
  -- 2x Gà rán (70k) + 1x Mì xào (60k) + 2x Bia Tiger (40k) + 2x Trà đá (10k) = 180k
  INSERT INTO orders (customer_id, total_amount, status, created_at)
    VALUES (c1, 180000, 'dang_giao', NOW() - INTERVAL '1 day') RETURNING id INTO o5;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o5, p_ga_ran, 2, 35000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o5, p_mi_xao, 1, 60000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o5, p_bia_tiger, 2, 20000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o5, p_tra_da, 2, 5000);

  -- Đơn 6 — hôm nay, Xử lý, khách Thị Bình
  -- 0.5kg Chả cá (60k) + 1x Phở bò (55k) + 2x Pepsi (30k) + 2x Cà phê (50k) = 195k
  INSERT INTO orders (customer_id, total_amount, status, created_at)
    VALUES (c2, 195000, 'xu_ly', NOW()) RETURNING id INTO o6;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o6, p_cha_ca, 0.5, 120000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o6, p_pho_bo, 1, 55000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o6, p_pepsi, 2, 15000);
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (o6, p_ca_phe, 2, 25000);

  RAISE NOTICE 'Seed hoàn thành: 15 sản phẩm, 3 khách hàng, 6 đơn hàng';

END $$;
