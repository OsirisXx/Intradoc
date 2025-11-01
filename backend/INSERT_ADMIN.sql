-- Insert Admin User
-- Email: admin@nia.gov.ph
-- Password: admin123

INSERT INTO user (
    NAME, 
    ID_NUMBER, 
    EMAIL, 
    PASSWORD, 
    SECTION_ID, 
    FUNCTIONAL_ROLE, 
    ORGANIZATIONAL_ROLE, 
    STATUS, 
    CREATED_AT
) VALUES (
    'Admin Bootstrap',
    'ADM000',
    'admin@nia.gov.ph',
    '$2a$10$/yAtcNpM/BYEmos9pH1OAO7hjZl/RshRZEaWVEle/uxjzRPLcHaum',
    5,
    'admin',
    'Administrative',
    'active',
    NOW()
);

