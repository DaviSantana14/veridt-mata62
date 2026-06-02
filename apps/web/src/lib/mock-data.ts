import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Fingerprint,
  Gavel,
  MonitorPlay,
  Scale,
  ShieldCheck,
  TimerReset,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type RecordStatus = "completed" | "progress" | "failed";
export type RecordKind = "video" | "screenshot";

export type VeriditRecord = {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  completedAt?: string;
  status: RecordStatus;
  kind: RecordKind;
  duration?: string;
  size?: string;
  description: string;
  hash: string;
};

export type CreditPlan = {
  id: "initial" | "professional" | "enterprise";
  name: string;
  records: number;
  price: string;
  pricePerRecord: string;
  popular?: boolean;
  features: string[];
};

export const currentUser = {
  name: "Ana Carolina Silva",
  firstName: "Ana",
  initials: "AS",
  email: "ana.silva@email.com",
  cpf: "123.456.789-00",
  phone: "(11) 98765-4321",
  credits: 12,
  lastPasswordChange: "15/04/2024",
};

export const records: VeriditRecord[] = [
  {
    id: "reg-001",
    title: "Registro de Prova - Processo #2024/001",
    url: "https://exemplo-processo.jus.br/detalhes",
    createdAt: "01/05/2024, 14:30",
    completedAt: "01/05/2024, 14:35",
    status: "completed",
    kind: "video",
    duration: "05:22",
    size: "24.8 MB",
    description: "Navegação completa no processo judicial #2024/001",
    hash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  },
  {
    id: "reg-002",
    title: "Captura de Tela - Contrato de Locação",
    url: "https://docs.exemplo.com/contrato-locacao",
    createdAt: "28/04/2024, 09:15",
    completedAt: "28/04/2024, 09:16",
    status: "completed",
    kind: "screenshot",
    size: "3.2 MB",
    description: "Registro visual do contrato de locação assinado.",
    hash: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
  },
  {
    id: "reg-003",
    title: "Registro de Conversa - WhatsApp Web",
    url: "https://web.whatsapp.com/",
    createdAt: "25/04/2024, 16:45",
    completedAt: "25/04/2024, 16:50",
    status: "completed",
    kind: "video",
    duration: "04:11",
    size: "19.5 MB",
    description: "Gravação da conversa preservada para conferência futura.",
    hash: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
  },
  {
    id: "reg-004",
    title: "Captura de Tela - Rede Social",
    url: "https://instagram.com/perfil_exemplo",
    createdAt: "20/04/2024, 11:00",
    completedAt: "20/04/2024, 11:01",
    status: "completed",
    kind: "screenshot",
    size: "2.8 MB",
    description: "Evidência pública de postagem em rede social.",
    hash: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
  },
  {
    id: "reg-005",
    title: "Registro de Sessão - Sistema Bancário",
    url: "https://internetbanking.exemplo.com/",
    createdAt: "07/05/2024, 10:00",
    status: "progress",
    kind: "video",
    duration: "00:43",
    size: "8.1 MB",
    description: "Registro em processamento para validação de integridade.",
    hash: "em-processamento",
  },
  {
    id: "reg-006",
    title: "Captura de Tela - E-mail de Ameaça",
    url: "https://mail.google.com/",
    createdAt: "15/04/2024, 08:30",
    completedAt: "15/04/2024, 08:31",
    status: "completed",
    kind: "screenshot",
    size: "1.7 MB",
    description: "Screenshot de mensagem recebida por e-mail.",
    hash: "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  },
  {
    id: "reg-007",
    title: "Registro de Site - Notícia Falsa",
    url: "https://portaldenoticias.exemplo.com/fake-news",
    createdAt: "10/04/2024, 13:20",
    status: "failed",
    kind: "video",
    description: "Tentativa de captura interrompida por indisponibilidade.",
    hash: "falha-na-captura",
  },
];

export const trustIndicators = [
  {
    label: "Cadeia de custódia",
    value: "Auditável",
    description: "Eventos, hash e metadados preservados em cada captura.",
    icon: Fingerprint,
  },
  {
    label: "Relatório técnico",
    value: "Pronto para anexar",
    description: "Documento claro para triagem jurídica e conferência.",
    icon: FileText,
  },
  {
    label: "Operação segura",
    value: "Mock verificado",
    description: "Fluxos simulados enquanto o gateway real evolui.",
    icon: ShieldCheck,
  },
] as const;

export const dashboardActivity = [
  {
    title: "Registro reg-001 validado",
    description: "Hash conferido e relatório documental disponível.",
    time: "Hoje, 14:35",
    icon: BadgeCheck,
  },
  {
    title: "Captura bancária em processamento",
    description: "Mídia aguardando fechamento de metadados.",
    time: "Hoje, 10:00",
    icon: TimerReset,
  },
  {
    title: "Créditos atualizados",
    description: "Saldo sincronizado com a conta demonstrativa.",
    time: "Ontem, 18:12",
    icon: CircleDot,
  },
] as const;

export const captureChecklist = [
  "URL protocolada antes do início",
  "Data, horário e agente registrados",
  "Metadados técnicos preservados",
  "Hash gerado ao concluir a captura",
] as const;

export const chainOfCustody = [
  {
    title: "Captura iniciada",
    description: "Sessão aberta com identificação do usuário e URL alvo.",
    time: "14:30",
  },
  {
    title: "Mídia registrada",
    description: "Vídeo/screenshot armazenado com metadados de origem.",
    time: "14:34",
  },
  {
    title: "Integridade calculada",
    description: "Hash SHA-256 anexado ao relatório técnico.",
    time: "14:35",
  },
] as const;

export const plans: CreditPlan[] = [
  {
    id: "initial",
    name: "Pacote Inicial",
    records: 5,
    price: "R$ 49,90",
    pricePerRecord: "R$ 9,98 por registro",
    features: [
      "5 créditos",
      "Vídeos e screenshots",
      "Relatórios com hash",
      "Download em ZIP",
      "Validade de 12 meses",
    ],
  },
  {
    id: "professional",
    name: "Pacote Profissional",
    records: 15,
    price: "R$ 129,90",
    pricePerRecord: "R$ 8,66 por registro",
    popular: true,
    features: [
      "15 créditos",
      "Vídeos e screenshots",
      "Relatórios com hash",
      "Download em ZIP",
      "Validade de 12 meses",
    ],
  },
  {
    id: "enterprise",
    name: "Pacote Empresarial",
    records: 50,
    price: "R$ 349,90",
    pricePerRecord: "R$ 7,00 por registro",
    features: [
      "50 créditos",
      "Vídeos e screenshots",
      "Relatórios com hash",
      "Download em ZIP",
      "Validade de 12 meses",
    ],
  },
];

export const landingFeatures: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Captura de Tela",
    description: "Registre páginas web em imagens com data, URL e rastreio.",
    icon: Camera,
  },
  {
    title: "Gravação de Navegação",
    description: "Documente o percurso completo em vídeo para evidência.",
    icon: MonitorPlay,
  },
  {
    title: "Relatórios com Hash",
    description: "Gere documentos de validação com integridade verificável.",
    icon: FileText,
  },
  {
    title: "Arquivo ZIP",
    description: "Baixe mídias, relatório e metadados em um pacote único.",
    icon: ShieldCheck,
  },
];

export const statusCopy: Record<
  RecordStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  completed: {
    label: "Concluído",
    icon: CheckCircle2,
    className: "bg-[color:var(--success-soft)] text-[color:var(--success)]",
  },
  progress: {
    label: "Em Andamento",
    icon: Clock3,
    className: "bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
  },
  failed: {
    label: "Falha",
    icon: AlertTriangle,
    className: "bg-[color:var(--danger-soft)] text-destructive",
  },
};

export const captureTypes = [
  { value: "video", label: "Vídeo", icon: Video },
  { value: "screenshot", label: "Screenshot", icon: Camera },
] as const;

export const reportValidationItems = [
  { label: "Assinatura digital", value: "Validada", icon: BadgeCheck },
  { label: "Hash de integridade", value: "Confirmado", icon: ShieldCheck },
  { label: "Cadeia de custódia", value: "Registrada", icon: CircleDot },
];

export const legalProofPillars = [
  {
    title: "Preservação",
    description: "Mídia, metadados e hash ficam unidos em um registro único.",
    icon: ShieldCheck,
  },
  {
    title: "Leitura jurídica",
    description: "Relatório objetivo com linguagem útil para petições e triagem.",
    icon: Scale,
  },
  {
    title: "Governança",
    description: "Histórico de ações, responsável e cadeia de custódia visíveis.",
    icon: Gavel,
  },
] as const;

export function getRecordById(id: string) {
  return records.find((record) => record.id === id) ?? records[0];
}
