/**
 * useFormValidation - Form Doğrulama Hook'u
 * 
 * Bu hook form doğrulama işlemlerini tek merkezden yönetir.
 * Herhangi bir form için yeniden kullanılabilir.
 */

import { useState, useCallback, useMemo } from 'react';
import { ValidationResult } from '../utils/validators';

/**
 * Form alanı tanımı
 */
export interface FormField<T = any> {
  value: T;
  error?: string;
  isValid: boolean;
  isTouched: boolean;
  validator?: (value: T) => ValidationResult;
}

/**
 * Form state tipi
 */
export type FormState<T extends Record<string, any>> = {
  [K in keyof T]: FormField<T[K]>;
};

/**
 * Form validation hook'u
 * @param initialValues - Form'un başlangıç değerleri
 * @param validators - Her alan için validator fonksiyonları
 */
export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validators: Partial<Record<keyof T, (value: any) => ValidationResult>> = {}
) => {
  // Form state'ini başlat
  const [formState, setFormState] = useState<FormState<T>>(() => {
    const initialState: any = {};
    
    Object.keys(initialValues).forEach((key) => {
      initialState[key] = {
        value: initialValues[key],
        error: undefined,
        isValid: true,
        isTouched: false,
        validator: validators[key],
      };
    });
    
    return initialState;
  });

  /**
   * Tek bir alanın değerini günceller ve doğrular
   * @param fieldName - Güncellenecek alan adı
   * @param value - Yeni değer
   */
  const updateField = useCallback((fieldName: keyof T, value: any) => {
    setFormState(prev => {
      const field = prev[fieldName];
      const validator = field.validator;
      
      let validationResult: ValidationResult = { isValid: true };
      
      if (validator) {
        validationResult = validator(value);
      }
      
      return {
        ...prev,
        [fieldName]: {
          ...field,
          value,
          error: validationResult.errorMessage,
          isValid: validationResult.isValid,
          isTouched: true,
        },
      };
    });
  }, []);

  /**
   * Alanın dokunuldu durumunu işaretler (blur event için)
   * @param fieldName - İşaretlenecek alan adı
   */
  const touchField = useCallback((fieldName: keyof T) => {
    setFormState(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isTouched: true,
      },
    }));
  }, []);

  /**
   * Tüm form'u doğrular
   * @returns Form geçerli mi?
   */
  const validateForm = useCallback(() => {
    let isFormValid = true;
    
    setFormState(prev => {
      const newState = { ...prev } as FormState<T>;
      
      Object.keys(newState).forEach((key) => {
        const typedKey = key as keyof T;
        const field = newState[typedKey];
        const validator = field.validator;
        
        if (validator) {
          const validationResult = validator(field.value);
          
          (newState as any)[typedKey] = {
            ...field,
            error: validationResult.errorMessage,
            isValid: validationResult.isValid,
            isTouched: true,
          };
          
          if (!validationResult.isValid) {
            isFormValid = false;
          }
        }
      });
      
      return newState;
    });
    
    return isFormValid;
  }, []);

  /**
   * Form'u sıfırlar
   */
  const resetForm = useCallback(() => {
    setFormState(() => {
      const resetState: any = {};
      
      Object.keys(initialValues).forEach((key) => {
        resetState[key] = {
          value: initialValues[key],
          error: undefined,
          isValid: true,
          isTouched: false,
          validator: validators[key],
        };
      });
      
      return resetState;
    });
  }, [initialValues, validators]);

  /**
   * Form'un geçerli değerlerini döndürür
   */
  const getFormValues = useCallback((): T => {
    const values: any = {};
    
    Object.keys(formState).forEach((key) => {
      values[key] = formState[key].value;
    });
    
    return values;
  }, [formState]);

  /**
   * Form'un genel durumunu hesaplar
   */
  const formStatus = useMemo(() => {
    const fields = Object.values(formState);
    
    const hasErrors = fields.some(field => !field.isValid && field.isTouched);
    const isAllTouched = fields.every(field => field.isTouched);
    const isAllValid = fields.every(field => field.isValid);
    
    return {
      hasErrors,
      isAllTouched,
      isAllValid,
      isSubmittable: isAllValid && !hasErrors,
    };
  }, [formState]);

  /**
   * Belirli bir alanın durumunu döndürür
   * @param fieldName - Kontrol edilecek alan adı
   */
  const getFieldProps = useCallback((fieldName: keyof T) => {
    const field = formState[fieldName];
    
    return {
      value: field.value,
      error: field.isTouched ? field.error : undefined,
      hasError: field.isTouched && !field.isValid,
      isValid: field.isValid,
      isTouched: field.isTouched,
      onChange: (value: any) => updateField(fieldName, value),
      onBlur: () => touchField(fieldName),
    };
  }, [formState, updateField, touchField]);

  return {
    // State
    formState,
    formStatus,
    
    // Actions
    updateField,
    touchField,
    validateForm,
    resetForm,
    getFormValues,
    getFieldProps,
  };
}; 