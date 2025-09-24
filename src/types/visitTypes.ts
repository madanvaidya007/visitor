// Centralized visit-related type definitions

export interface Visitor {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  photo_url?: string;
}

export interface Host {
  id: string;
  full_name: string;
  company?: string;
}

export interface VisitRequest {
  id: string;
  visitor_id: string;
  host_id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out' | 'cancelled';
  notes?: string;
  rejection_reason?: string;
  qr_code?: string;
  documents_uploaded?: boolean;
  created_at: string;
  updated_at?: string;
  visitor: Visitor;
  host: Host;
}

// Legacy interface for backward compatibility with reception pages
export interface LegacyVisitRequest {
  id: string;
  visitor_name: string;
  visitor_email?: string;
  visitor_phone?: string;
  visitor_company?: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out';
  host_name: string;
  qr_code?: string;
  pass_generated?: boolean;
  created_at: string;
  priority?: 'VIP' | 'Scheduled' | 'Walk-in' | 'Delivery';
}

export interface GeneratedPass {
  id: string;
  visitor_name: string;
  visitor_company?: string;
  host_name: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  qr_code: string;
  pass_number: string;
  status: string;
}

export interface ZoneAccess {
  id: string;
  visit_request_id: string;
  zone_id: string;
  granted_at: string;
  granted_by: string;
  zone: {
    id: string;
    name: string;
    description?: string;
  };
  visit_request: VisitRequest;
}

export type VisitStatus = 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out' | 'cancelled';
export type FilterStatus = 'all' | VisitStatus;
export type SortBy = 'date' | 'created' | 'status' | 'host' | 'visitor';
export type SortOrder = 'asc' | 'desc';
export type DateRange = 'all' | 'today' | 'week' | 'month' | 'year';