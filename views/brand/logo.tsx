export const brandLogoSrc = "/mattel-logo.png";

export function BrandLogo({ className = "h-8 w-auto", alt = "Mattel Infrastructures" }: { className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brandLogoSrc} alt={alt} className={className} />
  );
}
