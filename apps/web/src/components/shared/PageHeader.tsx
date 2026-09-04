import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </CardContent>
    </Card>
  );
}