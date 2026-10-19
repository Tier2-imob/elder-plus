import type { ServiceItem } from '@/screens/DiscoverScreen'
import type MaterialIcons from '@expo/vector-icons/MaterialIcons'

type CategoryData = {
  icon: keyof typeof MaterialIcons.glyphMap
  items: ServiceItem[]
}

export const CATEGORY_DATA: Record<string, CategoryData> = {
  saude: {
    icon: 'favorite-border',
    items: [
      { id: 's1', name: 'Clínica Vida Ativa',    tag: 'Cardiologia',    distance: 800,  rating: 4.8, recency: 3, icon: 'favorite-border' },
      { id: 's2', name: 'Fisio Bem Estar',        tag: 'Fisioterapia',   distance: 1500, rating: 4.6, recency: 1, icon: 'favorite-border' },
      { id: 's3', name: 'Cuidar Enfermagem',      tag: 'Home care',      distance: 2100, rating: 4.9, recency: 2, icon: 'favorite-border' },
    ],
  },
  farmacias: {
    icon: 'local-pharmacy',
    items: [
      { id: 'f1', name: 'Farmácia Popular',       tag: 'Conveniência',   distance: 1200, rating: 4.5, recency: 2, icon: 'local-pharmacy' },
      { id: 'f2', name: 'Drogaria Central',        tag: 'Manipulação',    distance: 1800, rating: 4.7, recency: 1, icon: 'local-pharmacy' },
      { id: 'f3', name: 'FarmaVita',              tag: 'Delivery',       distance: 900,  rating: 4.4, recency: 3, icon: 'local-pharmacy' },
    ],
  },
  moradia: {
    icon: 'home-work',
    items: [
      { id: 'm1', name: 'Residencial Aurora',     tag: 'Assistida',      distance: 3000, rating: 4.9, recency: 1, icon: 'home-work' },
      { id: 'm2', name: 'Lar São Francisco',      tag: 'Compartilhada',  distance: 5000, rating: 4.8, recency: 3, icon: 'home-work' },
      { id: 'm3', name: 'Vila Maturidade',        tag: 'Independente',   distance: 4200, rating: 4.6, recency: 2, icon: 'home-work' },
    ],
  },
  produtos: {
    icon: 'shopping-bag',
    items: [
      { id: 'p1', name: 'Vida Longa Store',       tag: 'Longevidade',    distance: 2000, rating: 4.6, recency: 2, icon: 'shopping-bag' },
      { id: 'p2', name: 'Ortopedia Senior',       tag: 'Acessibilidade', distance: 3500, rating: 4.7, recency: 1, icon: 'shopping-bag' },
      { id: 'p3', name: 'Conforto & Saúde',      tag: 'Cuidados',       distance: 1600, rating: 4.5, recency: 3, icon: 'shopping-bag' },
    ],
  },
  servicos: {
    icon: 'handyman',
    items: [
      { id: 'sv1', name: 'HandyMax Serviços',     tag: 'Manutenção',     distance: 1000, rating: 4.5, recency: 3, icon: 'handyman' },
      { id: 'sv2', name: 'Leva & Traz',           tag: 'Transporte',     distance: 2300, rating: 4.8, recency: 1, icon: 'handyman' },
      { id: 'sv3', name: 'Casa em Ordem',         tag: 'Limpeza',        distance: 1700, rating: 4.6, recency: 2, icon: 'handyman' },
    ],
  },
  lazer: {
    icon: 'directions-walk',
    items: [
      { id: 'l1', name: 'Espaço Bem Viver',       tag: 'Atividade física', distance: 2000, rating: 4.9, recency: 2, icon: 'directions-walk' },
      { id: 'l2', name: 'Clube da Memória',       tag: 'Social',           distance: 4000, rating: 4.7, recency: 3, icon: 'directions-walk' },
      { id: 'l3', name: 'Yoga Sênior',            tag: 'Bem-estar',        distance: 1500, rating: 4.8, recency: 1, icon: 'directions-walk' },
    ],
  },
  financas: {
    icon: 'account-balance-wallet',
    items: [
      { id: 'fin1', name: 'Assessoria Prever',    tag: 'Previdência',    distance: 2800, rating: 4.8, recency: 1, icon: 'account-balance-wallet' },
      { id: 'fin2', name: 'Banco Amigo',          tag: 'Conta simplificada', distance: 3200, rating: 4.6, recency: 3, icon: 'account-balance-wallet' },
      { id: 'fin3', name: 'Crédito Sênior',       tag: 'Financiamento',  distance: 2100, rating: 4.5, recency: 2, icon: 'account-balance-wallet' },
    ],
  },
}