interface LogoProps {
  size?: 'sm' | 'lg';
}

export default function Logo({ size = 'sm' }: LogoProps) {
  return (
    <div className={`logo-slot logo-slot--${size}`}>
      <img src="/logo.png" alt="Logo de ISAI Lavandería" />
    </div>
  );
}
