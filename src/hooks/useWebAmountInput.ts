/**
 * useWebAmountInput Hook - Web için gelişmiş tutar input yönetimir
 * Web'de TextInput focus/blur sorunlarını çözer ve daha iyi UX sağlar
 */

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

type UseWebAmountInputProps = {
  initialValue?: string;
  maxDecimals?: number;
};

const useWebAmountInput = ({
  initialValue = '',
  maxDecimals = 2,
}: UseWebAmountInputProps = {}) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = useCallback(
    (text: string) => {
      // Allow clearing the input
      if (text === '') {
        setValue('');
        return;
      }

      // 1. Sanitize the input: replace comma with dot, remove non-numeric/non-dot characters
      let sanitizedText = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');

      // 2. Ensure only one dot is present
      const parts = sanitizedText.split('.');
      if (parts.length > 2) {
        sanitizedText = `${parts[0]}.${parts.slice(1).join('')}`;
      }

      // 3. Limit the number of decimal places
      if (parts[1] && parts[1].length > maxDecimals) {
        sanitizedText = `${parts[0]}.${parts[1].substring(0, maxDecimals)}`;
      }

      // 4. Prevent leading dots
      if (sanitizedText.startsWith('.')) {
        sanitizedText = `0${sanitizedText}`;
      }

      setValue(sanitizedText);
    },
    [maxDecimals]
  );

  const clear = useCallback(() => {
    setValue('');
  }, []);

  return {
    value,
    onChangeText: handleChange,
    clear,
    setValue,
  };
};

export default useWebAmountInput; 