import { ExternalLink as LinkIcon } from "lucide-react";

export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-medium text-blue-700 no-underline hover:bg-blue-100 hover:text-blue-900 hover:underline transition-colors"
    >
      {children}
      <LinkIcon className="h-3.5 w-3.5" />
    </a>
  );
}
