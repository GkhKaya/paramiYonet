import { makeObservable, observable, action } from 'mobx';

export interface BaseViewModelState {
  isLoading: boolean;
  error: string | null;
}

export abstract class BaseViewModel {
  // Observable state
  isLoading: boolean = false;
  error: string | null = null;
  protected setState?: any;
  protected state?: any;

  constructor(setState?: any, initialState?: any) {
    this.setState = setState;
    this.state = initialState;
    
    makeObservable(this, {
      isLoading: observable,
      error: observable,
      setLoading: action,
      setError: action,
      clearError: action,
    });
  }

  // Actions
  setLoading = (isLoading: boolean) => {
    this.isLoading = isLoading;
  };

  setError = (error: string | null) => {
    this.error = error;
  };

  clearError = () => {
    this.error = null;
  };

  // Async operation wrapper
  protected executeAsync = async <T>(operation: () => Promise<T>): Promise<T | null> => {
    try {
      this.setLoading(true);
      this.clearError();
      const result = await operation();
      return result;
    } catch (error) {
      console.error('ViewModel operation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu';
      this.setError(errorMessage);
      return null;
    } finally {
      this.setLoading(false);
    }
  };

  // Legacy support for existing code
  protected handleAsync = this.executeAsync;
} 