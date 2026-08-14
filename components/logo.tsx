import Image from "next/image";

export default function Logo({
  size,
  className = "",
}: {
  size: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Exai"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
