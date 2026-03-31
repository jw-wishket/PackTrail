export function Spinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-20 ${className || ''}`}>
      <div className="w-8 h-8 border-3 border-olive/30 border-t-olive rounded-full animate-spin" />
    </div>
  );
}
