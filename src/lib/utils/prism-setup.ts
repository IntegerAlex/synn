'use client';

// Import Prism first - this must be evaluated before language components
import Prism from 'prismjs';

// Ensure Prism is available globally for language components
// PrismJS language components expect Prism to be available on the global object
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Prism = Prism;
}
if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

// Now load language components - they will register themselves with Prism
// These imports must come after Prism is imported and assigned globally
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

// Export Prism for use in components
export default Prism;

