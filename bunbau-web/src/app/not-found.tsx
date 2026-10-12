import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-gray-500 mb-4">The requested page does not exist.</p>
      <Link href="/" className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold">
        Return Home
      </Link>
    </div>
  );
}
