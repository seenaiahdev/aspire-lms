import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  id?: string;
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ id, children, className, hover, onClick }: CardProps) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={cn('card', hover && 'card-hover cursor-pointer', className)}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={cn('p-5 pb-0', className)}>{children}</div>;
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className }: CardBodyProps) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return <div className={cn('p-5 pt-0', className)}>{children}</div>;
}
