-- ============================================================
-- SCHOOL MANAGEMENT SYSTEM - Complete Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS school_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE school_management;

-- ============================================================
-- SCHOOL SETTINGS
-- ============================================================
CREATE TABLE school_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_name VARCHAR(200) NOT NULL DEFAULT 'My School',
  school_motto VARCHAR(300),
  school_address TEXT,
  school_phone VARCHAR(20),
  school_email VARCHAR(100),
  school_website VARCHAR(200),
  school_logo VARCHAR(500),
  school_type ENUM('primary','junior_high','senior_high','combined') DEFAULT 'combined',
  headmaster_name VARCHAR(200),
  headmaster_signature VARCHAR(500),
  academic_year_id INT,
  current_term_id INT,
  sms_enabled TINYINT(1) DEFAULT 0,
  email_enabled TINYINT(1) DEFAULT 1,
  whatsapp_enabled TINYINT(1) DEFAULT 0,
  twilio_account_sid VARCHAR(100),
  twilio_auth_token VARCHAR(100),
  twilio_phone VARCHAR(20),
  whatsapp_api_key VARCHAR(200),
  smtp_host VARCHAR(200),
  smtp_port INT DEFAULT 587,
  smtp_user VARCHAR(200),
  smtp_password VARCHAR(200),
  smtp_from VARCHAR(200),
  grading_system JSON,
  fee_currency VARCHAR(10) DEFAULT 'GHS',
  timezone VARCHAR(50) DEFAULT 'Africa/Accra',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- ACADEMIC YEARS
-- ============================================================
CREATE TABLE academic_years (
  id INT PRIMARY KEY AUTO_INCREMENT,
  year_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current TINYINT(1) DEFAULT 0,
  status ENUM('active','inactive','completed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- ACADEMIC TERMS
-- ============================================================
CREATE TABLE academic_terms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  academic_year_id INT NOT NULL,
  term_name VARCHAR(50) NOT NULL,
  term_number TINYINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current TINYINT(1) DEFAULT 0,
  status ENUM('active','inactive','completed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- ============================================================
-- USERS (All system users)
-- ============================================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','headmaster','teacher','accountant','parent','student') NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  profile_photo VARCHAR(500),
  is_active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP NULL,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP NULL,
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_email (email)
);

-- ============================================================
-- CLASSES
-- ============================================================
CREATE TABLE classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_name VARCHAR(100) NOT NULL,
  class_level VARCHAR(50),
  stream VARCHAR(50),
  class_teacher_id INT,
  capacity INT DEFAULT 40,
  description TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_name VARCHAR(150) NOT NULL,
  subject_code VARCHAR(20) UNIQUE NOT NULL,
  subject_type ENUM('core','elective','optional') DEFAULT 'core',
  description TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- CLASS SUBJECTS (Which subjects belong to which class)
-- ============================================================
CREATE TABLE class_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  UNIQUE KEY unique_class_subject_year (class_id, subject_id, academic_year_id)
);

-- ============================================================
-- TEACHERS
-- ============================================================
CREATE TABLE teachers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  staff_id VARCHAR(50) UNIQUE NOT NULL,
  gender ENUM('male','female','other') NOT NULL,
  date_of_birth DATE,
  qualification VARCHAR(200),
  specialization VARCHAR(200),
  employment_date DATE,
  employment_type ENUM('permanent','contract','part_time') DEFAULT 'permanent',
  address TEXT,
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  salary DECIMAL(10,2),
  status ENUM('active','on_leave','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- TEACHER SUBJECT ASSIGNMENTS
-- ============================================================
CREATE TABLE teacher_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  UNIQUE KEY unique_teacher_class_subject (teacher_id, class_id, subject_id, academic_year_id)
);

-- ============================================================
-- PARENTS
-- ============================================================
CREATE TABLE parents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  occupation VARCHAR(200),
  address TEXT,
  secondary_phone VARCHAR(20),
  relationship_type ENUM('father','mother','guardian','other') DEFAULT 'guardian',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  admission_number VARCHAR(50) UNIQUE NOT NULL,
  student_id_generated VARCHAR(50) UNIQUE NOT NULL,
  gender ENUM('male','female') NOT NULL,
  date_of_birth DATE,
  class_id INT,
  academic_year_id INT,
  parent_id INT,
  guardian_name VARCHAR(200),
  guardian_phone VARCHAR(20),
  guardian_email VARCHAR(100),
  guardian_relationship VARCHAR(50),
  address TEXT,
  previous_school VARCHAR(200),
  admission_date DATE DEFAULT (CURRENT_DATE),
  nationality VARCHAR(100) DEFAULT 'Ghanaian',
  religion VARCHAR(100),
  blood_group VARCHAR(10),
  medical_notes TEXT,
  status ENUM('active','inactive','graduated','transferred','suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL,
  INDEX idx_admission (admission_number),
  INDEX idx_class (class_id)
);

-- ============================================================
-- FEE STRUCTURES
-- ============================================================
CREATE TABLE fee_structures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  term_id INT NOT NULL,
  fee_type VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_mandatory TINYINT(1) DEFAULT 1,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE
);

-- ============================================================
-- FEE PAYMENTS
-- ============================================================
CREATE TABLE fee_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  student_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  term_id INT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  payment_method ENUM('cash','bank_transfer','mobile_money','cheque','card') DEFAULT 'cash',
  payment_reference VARCHAR(100),
  bank_name VARCHAR(100),
  received_by INT,
  notes TEXT,
  status ENUM('confirmed','pending','cancelled') DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_student_payment (student_id),
  INDEX idx_receipt (receipt_number)
);

-- ============================================================
-- EXAMINATIONS
-- ============================================================
CREATE TABLE examinations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  exam_name VARCHAR(200) NOT NULL,
  exam_type ENUM('class_test','assignment','mid_term','end_of_term','mock') NOT NULL,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  term_id INT NOT NULL,
  teacher_id INT,
  exam_date DATE,
  total_marks DECIMAL(5,2) NOT NULL DEFAULT 100,
  weight_percentage DECIMAL(5,2) DEFAULT 100,
  status ENUM('draft','active','submitted','approved') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- ============================================================
-- STUDENT SCORES
-- ============================================================
CREATE TABLE student_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  examination_id INT NOT NULL,
  class_test DECIMAL(5,2) DEFAULT 0,
  assignment DECIMAL(5,2) DEFAULT 0,
  mid_term DECIMAL(5,2) DEFAULT 0,
  end_of_term DECIMAL(5,2) DEFAULT 0,
  total_score DECIMAL(5,2) GENERATED ALWAYS AS (class_test + assignment + mid_term + end_of_term) STORED,
  grade VARCHAR(5),
  remarks VARCHAR(200),
  position_in_class INT,
  is_absent TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (examination_id) REFERENCES examinations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_exam (student_id, examination_id)
);

-- ============================================================
-- TERM RESULTS (Aggregated per term)
-- ============================================================
CREATE TABLE term_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  term_id INT NOT NULL,
  total_subjects INT DEFAULT 0,
  total_marks DECIMAL(8,2) DEFAULT 0,
  average_marks DECIMAL(5,2) DEFAULT 0,
  overall_grade VARCHAR(5),
  position_in_class INT,
  total_students INT,
  attendance_days INT DEFAULT 0,
  school_days INT DEFAULT 0,
  headmaster_remarks TEXT,
  class_teacher_remarks TEXT,
  next_term_begins DATE,
  status ENUM('draft','approved','published') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_term (student_id, academic_year_id, term_id)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  term_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present','absent','late','excused') DEFAULT 'present',
  remarks VARCHAR(200),
  recorded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_attendance (student_id, attendance_date),
  INDEX idx_date (attendance_date)
);

-- ============================================================
-- TIMETABLE
-- ============================================================
CREATE TABLE timetable (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT,
  academic_year_id INT NOT NULL,
  term_id INT NOT NULL,
  day_of_week ENUM('monday','tuesday','wednesday','thursday','friday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE
);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipient_user_id INT,
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(100),
  notification_type ENUM('sms','email','whatsapp','in_app') NOT NULL,
  subject VARCHAR(300),
  message TEXT NOT NULL,
  status ENUM('sent','failed','pending') DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP NULL,
  reference_type VARCHAR(50),
  reference_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_recipient (recipient_user_id),
  INDEX idx_status (status)
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_table (table_name)
);

-- ============================================================
-- SCHOOL CALENDAR / EVENTS
-- ============================================================
CREATE TABLE school_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_title VARCHAR(300) NOT NULL,
  event_description TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  event_type ENUM('holiday','exam','meeting','sports','cultural','other') DEFAULT 'other',
  academic_year_id INT,
  is_public TINYINT(1) DEFAULT 1,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- ASSIGNMENTS / DOCUMENTS
-- ============================================================
CREATE TABLE assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  term_id INT NOT NULL,
  due_date DATE,
  file_path VARCHAR(500),
  max_marks DECIMAL(5,2) DEFAULT 100,
  status ENUM('active','closed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE
);

-- ============================================================
-- STUDENT PROMOTIONS
-- ============================================================
CREATE TABLE student_promotions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  from_class_id INT NOT NULL,
  to_class_id INT NOT NULL,
  from_academic_year_id INT NOT NULL,
  to_academic_year_id INT NOT NULL,
  promotion_date DATE DEFAULT (CURRENT_DATE),
  promoted_by INT,
  remarks TEXT,
  status ENUM('promoted','repeated','graduated','transferred') DEFAULT 'promoted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (from_class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (to_class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (from_academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (to_academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (promoted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- DEFAULT DATA
-- ============================================================
INSERT INTO school_settings (school_name, school_motto, school_type, email_enabled) VALUES
('Ghana Model School', 'Excellence in Education', 'combined', 1);

INSERT INTO academic_years (year_name, start_date, end_date, is_current, status) VALUES
('2025/2026', '2025-09-01', '2026-07-31', 1, 'active');

INSERT INTO academic_terms (academic_year_id, term_name, term_number, start_date, end_date, is_current) VALUES
(1, 'First Term', 1, '2025-09-01', '2025-12-15', 0),
(1, 'Second Term', 2, '2026-01-05', '2026-04-10', 1),
(1, 'Third Term', 3, '2026-04-27', '2026-07-31', 0);

-- Default admin user (password: Admin@123 - CHANGE IN PRODUCTION)
INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, is_active) VALUES
('admin', 'admin@school.edu.gh', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaJobMFEGsvsCHa8u9YvNSSvW', 'admin', 'System', 'Administrator', '0200000000', 1),
('headmaster', 'headmaster@school.edu.gh', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaJobMFEGsvsCHa8u9YvNSSvW', 'headmaster', 'John', 'Mensah', '0201111111', 1),
('accountant1', 'accountant@school.edu.gh', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaJobMFEGsvsCHa8u9YvNSSvW', 'accountant', 'Abena', 'Owusu', '0202222222', 1);

-- Default subjects
INSERT INTO subjects (subject_name, subject_code, subject_type) VALUES
('English Language', 'ENG', 'core'),
('Mathematics', 'MATH', 'core'),
('Integrated Science', 'SCI', 'core'),
('Social Studies', 'SOC', 'core'),
('Religious & Moral Education', 'RME', 'core'),
('Ghanaian Language', 'GHL', 'core'),
('Creative Arts', 'CAT', 'core'),
('ICT', 'ICT', 'elective'),
('French', 'FRE', 'elective'),
('Physical Education', 'PE', 'core'),
('History', 'HIS', 'elective'),
('Economics', 'ECO', 'elective'),
('Geography', 'GEO', 'elective'),
('Physics', 'PHY', 'elective'),
('Chemistry', 'CHEM', 'elective'),
('Biology', 'BIO', 'elective'),
('Elective Mathematics', 'EMATH', 'elective'),
('Literature in English', 'LIT', 'elective'),
('Government', 'GOV', 'elective');

-- Default classes
INSERT INTO classes (class_name, class_level, stream, status) VALUES
('Basic 1', 'Primary', 'A', 'active'),
('Basic 2', 'Primary', 'A', 'active'),
('Basic 3', 'Primary', 'A', 'active'),
('Basic 4', 'Primary', 'A', 'active'),
('Basic 5', 'Primary', 'A', 'active'),
('Basic 6', 'Primary', 'A', 'active'),
('JHS 1', 'Junior High', 'A', 'active'),
('JHS 2', 'Junior High', 'A', 'active'),
('JHS 3', 'Junior High', 'A', 'active'),
('SHS 1', 'Senior High', 'Science', 'active'),
('SHS 2', 'Senior High', 'Science', 'active'),
('SHS 3', 'Senior High', 'Science', 'active');
