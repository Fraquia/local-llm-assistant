import { useState, useCallback } from 'react';
import { getDocumentText, getSelectedText, getDocumentTitle } from '../../office/office-api';

interface UseDocumentContentReturn {
  documentText: string;
  documentTitle: string;
  isLoading: boolean;
  error: string;
  fetchDocument: () => Promise<{ text: string; title: string } | null>;
  fetchSelection: () => Promise<string>;
}

export function useDocumentContent(): UseDocumentContentReturn {
  const [documentText, setDocumentText] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDocument = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [text, title] = await Promise.all([getDocumentText(), getDocumentTitle()]);
      setDocumentText(text);
      setDocumentTitle(title);
      return { text, title };
    } catch {
      setError('Failed to read document. Make sure a document is open.');
      setDocumentText('');
      setDocumentTitle('');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSelection = useCallback(async () => {
    try {
      return await getSelectedText();
    } catch {
      return '';
    }
  }, []);

  return { documentText, documentTitle, isLoading, error, fetchDocument, fetchSelection };
}
