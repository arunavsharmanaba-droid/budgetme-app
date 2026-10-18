import React from 'react';
import {
  Home,
  Utensils,
  Car,
  Film,
  Heart,
  Armchair,
  GraduationCap,
  Package,
  ArrowRightLeft,
  Briefcase,
  Wallet,
  Clock,
  TrendingUp,
  PlusCircle,
  CircleDollarSign,
  ShoppingBag,
  Tag,
  HelpCircle,
  Coffee,
  Fuel,
  Receipt,
  Gift,
  DollarSign,
  Smile,
  LucideProps,
} from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  name?: string;
  className?: string;
}

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  Home,
  Utensils,
  Car,
  Film,
  Heart,
  Armchair,
  GraduationCap,
  Package,
  ArrowRightLeft,
  Briefcase,
  Wallet,
  Clock,
  TrendingUp,
  PlusCircle,
  CircleDollarSign,
  ShoppingBag,
  Tag,
  Coffee,
  Fuel,
  Receipt,
  Gift,
  DollarSign,
  Smile,
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-4 h-4', ...props }) => {
  const IconComponent = name && ICON_MAP[name] ? ICON_MAP[name] : HelpCircle;
  return <IconComponent className={className} {...props} />;
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);
