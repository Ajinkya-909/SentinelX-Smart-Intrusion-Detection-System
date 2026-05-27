/**
 * Auth Validation Utilities
 * Provides validation functions for auth form inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true };
};

/**
 * Validate first name
 */
export const validateFirstName = (firstName: string): ValidationResult => {
  if (!firstName) {
    return { isValid: false, error: "First name is required" };
  }

  if (firstName.trim().length === 0) {
    return { isValid: false, error: "First name must not be empty" };
  }

  if (firstName.length < 2) {
    return {
      isValid: false,
      error: "First name must be at least 2 characters",
    };
  }

  return { isValid: true };
};

/**
 * Validate last name (optional but if provided, validate it)
 */
export const validateLastName = (
  lastName: string | undefined,
): ValidationResult => {
  if (!lastName) {
    return { isValid: true }; // Optional field
  }

  if (lastName.trim().length === 0) {
    return { isValid: false, error: "Last name must not be empty" };
  }

  if (lastName.length < 2) {
    return { isValid: false, error: "Last name must be at least 2 characters" };
  }

  return { isValid: true };
};

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Cannot contain email or username
 */
export const validatePassword = (
  password: string,
  email?: string,
): ValidationResult => {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one number",
    };
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one special character",
    };
  }

  // Check if password contains email
  if (email) {
    const emailLocalPart = email.split("@")[0].toLowerCase();
    if (password.toLowerCase().includes(emailLocalPart)) {
      return {
        isValid: false,
        error: "Password cannot contain your email address",
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate password match
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string,
): ValidationResult => {
  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" };
  }

  return { isValid: true };
};

/**
 * Validate login form
 */
export const validateLoginForm = (
  email: string,
  password: string,
): ValidationResult => {
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  return { isValid: true };
};

/**
 * Validate signup form
 */
export const validateSignupForm = (
  firstName: string,
  email: string,
  password: string,
  confirmPassword: string,
  lastName?: string,
): ValidationResult => {
  const firstNameValidation = validateFirstName(firstName);
  if (!firstNameValidation.isValid) {
    return firstNameValidation;
  }

  if (lastName !== undefined) {
    const lastNameValidation = validateLastName(lastName);
    if (!lastNameValidation.isValid) {
      return lastNameValidation;
    }
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  const passwordValidation = validatePassword(password, email);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }

  const matchValidation = validatePasswordMatch(password, confirmPassword);
  if (!matchValidation.isValid) {
    return matchValidation;
  }

  return { isValid: true };
};
