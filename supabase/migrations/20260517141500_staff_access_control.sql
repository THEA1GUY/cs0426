-- Create pre_registered_staff table
CREATE TABLE IF NOT EXISTS public.pre_registered_staff (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    job_title TEXT,
    role TEXT CHECK (role IN ('new_employee', 'department_head', 'admin')) DEFAULT 'new_employee',
    status TEXT CHECK (status IN ('active', 'suspended', 'blocked')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add status to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'suspended', 'blocked')) DEFAULT 'active';

-- Enable RLS on pre_registered_staff
ALTER TABLE public.pre_registered_staff ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on pre_registered_staff
CREATE POLICY "Admins can manage pre_registered_staff" ON public.pre_registered_staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to validate signup before auth.users insert
CREATE OR REPLACE FUNCTION public.check_staff_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    -- Check if email is in the allowed pre-registration list
    SELECT status INTO v_status 
    FROM public.pre_registered_staff 
    WHERE email = NEW.email;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Signup Denied: Email % is not in the pre-registered staff list. Please contact your administrator.', NEW.email;
    ELSIF v_status != 'active' THEN
        RAISE EXCEPTION 'Access Denied: The account for % is currently %.', NEW.email, v_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS tr_check_staff_signup ON auth.users;
CREATE TRIGGER tr_check_staff_signup
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_staff_signup();

-- Create function to automatically create profile on signup using pre-registered data
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    r_staff RECORD;
BEGIN
    SELECT * INTO r_staff 
    FROM public.pre_registered_staff 
    WHERE email = NEW.email;

    IF r_staff IS NOT NULL THEN
        INSERT INTO public.profiles (id, name, department, job_title, role, status)
        VALUES (
            NEW.id,
            r_staff.name,
            r_staff.department,
            r_staff.job_title,
            r_staff.role,
            r_staff.status
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users after insert
DROP TRIGGER IF EXISTS tr_handle_new_user_profile ON auth.users;
CREATE TRIGGER tr_handle_new_user_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_profile();
