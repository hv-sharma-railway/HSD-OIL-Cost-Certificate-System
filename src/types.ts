export interface PriceData {
  base_price: number;
  excise: number;
  vat: number;
  overhead: number;
  pdf_base64?: string;
}

export interface PriceMasterEntry {
  id: string;
  supplying_shed: string;
  month: string;
  year: string;
  periodNames: {
    p1: string;
    p2: string;
  };
  periods: {
    p1: PriceData;
    p2: PriceData;
    average: PriceData;
  };
}

export interface ShedMasterEntry {
  id: string;
  shed_name: string;
  railway: string;
}

export interface SelectedShed extends ShedMasterEntry {
  instanceId: string;
  for_month: string;
  for_year: string;
  during_month: string;
  during_year: string;
  supplying_shed: string;
  pricing_period: 'p1' | 'p2' | 'average';
  goods_litres: number;
  coach_litres: number;
  is_power_car: boolean;
  voucher_pdf_base64?: string;
  voucher_pages?: string;
  voucher_pdf_name?: string;
  voucher_pdf_size?: string;
  voucher_pdf_type?: string;
  voucher_pdf_last_modified?: number;
}

export const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

export const YEARS = Array.from({ length: 10 }, (_, i) => (2024 + i).toString());

export const GOODS_ALLOCATION = '10021227';
export const COACH_ALLOCATION = '10021127';

export interface Session {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  state: {
    selectedMonth: string;
    selectedYear: string;
    selectedSupplyingShed: string;
    masterVoucherPdf: string | null;
    masterVoucherPdfName: string | null;
    selectedSheds: SelectedShed[];
  };
}

export interface ConsumptionRecord {
  id: string;
  shed_name: string;
  railway: string;
  supplying_shed: string;
  month: string;
  year: string;
  during_month: string;
  during_year: string;
  goods_litres: number;
  coach_litres: number;
  total_litres: number;
  amount: number;
  is_power_car: boolean;
  pricing_period: string;
  created_at: string;
}

export const POWER_CAR_ALLOCATIONS = {
  base: '08066031',
  excise: '08066036',
  vat: '08066038',
  overhead: '08066099'
};

export const INITIAL_SHED_MASTER: ShedMasterEntry[] = [
  {
    id: '1',
    shed_name: 'PUNE',
    railway: 'CR'
  },
  {
    id: '2',
    shed_name: 'RAJKOT',
    railway: 'WR'
  },
  {
    id: '3',
    shed_name: 'AHMEDABAD',
    railway: 'WR'
  }
];

export const INITIAL_PRICE_MASTER: PriceMasterEntry[] = [
  {
    id: 'p1',
    supplying_shed: 'HXP',
    month: 'FEB',
    year: '2026',
    periodNames: {
      p1: '1st-15th',
      p2: '16th-End'
    },
    periods: {
      p1: { base_price: 57309, excise: 17800, vat: 15066, overhead: 2169 },
      p2: { base_price: 57309, excise: 17800, vat: 15066, overhead: 2169 },
      average: { base_price: 57309, excise: 17800, vat: 15066, overhead: 2169 }
    }
  },
  {
    id: 'p2',
    supplying_shed: 'WKR',
    month: 'FEB',
    year: '2026',
    periodNames: {
      p1: '1st-15th',
      p2: '16th-End'
    },
    periods: {
      p1: { base_price: 56755, excise: 17800, vat: 14863, overhead: 1680 },
      p2: { base_price: 56755, excise: 17800, vat: 14863, overhead: 1680 },
      average: { base_price: 56755, excise: 17800, vat: 14863, overhead: 1680 }
    }
  }
];
