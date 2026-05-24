DO
$$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'veridit') THEN
    CREATE ROLE veridit WITH LOGIN PASSWORD 'veridit' CREATEDB;
  END IF;
END
$$;

CREATE DATABASE veridit_identity OWNER veridit;
CREATE DATABASE veridit_billing OWNER veridit;
CREATE DATABASE veridit_capture OWNER veridit;
CREATE DATABASE veridit_notification OWNER veridit;
CREATE DATABASE veridit_report OWNER veridit;
