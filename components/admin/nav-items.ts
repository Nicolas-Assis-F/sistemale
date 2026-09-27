import {
  LayoutDashboard, Package, Tag, ShoppingCart, FileText, Wrench, Images,
  MessageSquare, ClipboardList, Users, HardHat, BadgePercent, Landmark,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Chave do contador exibido como badge (preenchido pelo layout). */
  badgeKey?: 'unread' | 'inFabrication' | 'commissionsDue' | 'financeOverdue';
}

export interface AdminNavGroup {
  title?: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Visão geral' },
      { href: '/admin/financeiro', icon: Landmark, label: 'Financeiro', badgeKey: 'financeOverdue' },
    ],
  },
  {
    title: 'Operação',
    items: [
      { href: '/admin/pedidos', icon: ClipboardList, label: 'Pedidos', badgeKey: 'inFabrication' },
      { href: '/admin/clientes', icon: Users, label: 'Clientes' },
      { href: '/admin/funcionarios', icon: HardHat, label: 'Funcionários' },
      { href: '/admin/comissoes', icon: BadgePercent, label: 'Comissões', badgeKey: 'commissionsDue' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { href: '/admin/produtos', icon: Package, label: 'Produtos' },
      { href: '/admin/categorias', icon: Tag, label: 'Categorias' },
      { href: '/admin/lista-compras', icon: ShoppingCart, label: 'Lista de Compras' },
    ],
  },
  {
    title: 'Site institucional',
    items: [
      { href: '/admin/conteudo', icon: FileText, label: 'Conteúdo' },
      { href: '/admin/servicos', icon: Wrench, label: 'Serviços' },
      { href: '/admin/galeria', icon: Images, label: 'Galeria' },
    ],
  },
  {
    title: 'Comunicação',
    items: [{ href: '/admin/mensagens', icon: MessageSquare, label: 'Mensagens', badgeKey: 'unread' }],
  },
];
