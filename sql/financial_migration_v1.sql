-- ============================================================================
-- TindaGo — Financial Correctness Migration (v1)
-- Migrates all monetary and precision-sensitive columns from double precision
-- to numeric(12,2) to ensure financial accuracy and avoid rounding errors.
--
-- Applies to the shared Supabase project via the SQL editor:
--   URL: https://gncnluxjrpmbjmtzcwsv.supabase.co
-- ============================================================================

DO $$
BEGIN
    -- 1. products
    ALTER TABLE public.products ALTER COLUMN quantity TYPE numeric(12,2) USING quantity::numeric(12,2);
    ALTER TABLE public.products ALTER COLUMN cost_price TYPE numeric(12,2) USING cost_price::numeric(12,2);
    ALTER TABLE public.products ALTER COLUMN selling_price TYPE numeric(12,2) USING selling_price::numeric(12,2);
    ALTER TABLE public.products ALTER COLUMN low_stock_threshold TYPE numeric(12,2) USING low_stock_threshold::numeric(12,2);

    -- 2. customer_debts
    ALTER TABLE public.customer_debts ALTER COLUMN amount TYPE numeric(12,2) USING amount::numeric(12,2);
    ALTER TABLE public.customer_debts ALTER COLUMN remaining_balance TYPE numeric(12,2) USING remaining_balance::numeric(12,2);
    ALTER TABLE public.customer_debts ALTER COLUMN credit_limit TYPE numeric(12,2) USING credit_limit::numeric(12,2);

    -- 3. debt_payments
    ALTER TABLE public.debt_payments ALTER COLUMN amount TYPE numeric(12,2) USING amount::numeric(12,2);

    -- 4. debt_transactions
    ALTER TABLE public.debt_transactions ALTER COLUMN amount TYPE numeric(12,2) USING amount::numeric(12,2);

    -- 5. specific_sales
    ALTER TABLE public.specific_sales ALTER COLUMN amount TYPE numeric(12,2) USING amount::numeric(12,2);
    ALTER TABLE public.specific_sales ALTER COLUMN quantity TYPE numeric(12,2) USING quantity::numeric(12,2);
    ALTER TABLE public.specific_sales ALTER COLUMN profit TYPE numeric(12,2) USING profit::numeric(12,2);

    -- 6. expenses
    ALTER TABLE public.expenses ALTER COLUMN amount TYPE numeric(12,2) USING amount::numeric(12,2);

    -- 7. daily_entries
    ALTER TABLE public.daily_entries ALTER COLUMN stock_expenses TYPE numeric(12,2) USING stock_expenses::numeric(12,2);
    ALTER TABLE public.daily_entries ALTER COLUMN earnings TYPE numeric(12,2) USING earnings::numeric(12,2);

    -- 8. end_of_day_data
    ALTER TABLE public.end_of_day_data ALTER COLUMN cash_in_drawer TYPE numeric(12,2) USING cash_in_drawer::numeric(12,2);
    ALTER TABLE public.end_of_day_data ALTER COLUMN recorded_sales TYPE numeric(12,2) USING recorded_sales::numeric(12,2);
    ALTER TABLE public.end_of_day_data ALTER COLUMN actual_sales TYPE numeric(12,2) USING actual_sales::numeric(12,2);
    ALTER TABLE public.end_of_day_data ALTER COLUMN sales_diff TYPE numeric(12,2) USING sales_diff::numeric(12,2);
    ALTER TABLE public.end_of_day_data ALTER COLUMN profit TYPE numeric(12,2) USING profit::numeric(12,2);
    ALTER TABLE public.end_of_day_data ALTER COLUMN expenses TYPE numeric(12,2) USING expenses::numeric(12,2);
    ALTER TABLE public.end_of_day_data ALTER COLUMN net_profit TYPE numeric(12,2) USING net_profit::numeric(12,2);

    -- 9. restock_log
    ALTER TABLE public.restock_log ALTER COLUMN total_cost TYPE numeric(12,2) USING total_cost::numeric(12,2);

    -- 10. pre_orders (Phase 6)
    ALTER TABLE public.pre_orders ALTER COLUMN total_amount TYPE numeric(12,2) USING total_amount::numeric(12,2);

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Migration encountered an error: %', SQLERRM;
END $$;

-- 11. Update get_public_products function return type
DROP FUNCTION IF EXISTS public.get_public_products(uuid);
CREATE OR REPLACE FUNCTION public.get_public_products(p_store_uuid uuid)
RETURNS TABLE (
  id text, name text, unit text, price numeric(12,2),
  quantity numeric(12,2), package_size text, brand text, category text, subcategory text
) LANGUAGE sql SECURITY DEFINER STABLE AS
$$
  SELECT id, name, unit, selling_price, quantity, package_size, brand, category, subcategory
  FROM public.products
  WHERE user_id = p_store_uuid
  ORDER BY name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_products(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_products(uuid) TO anon, authenticated;
