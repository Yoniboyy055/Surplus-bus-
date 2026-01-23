'use client';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-slate-950 text-white flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
          <button 
            onClick={() => reset()}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
