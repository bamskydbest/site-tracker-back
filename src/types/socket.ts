export interface ServerToClientEvents {
  'new-checkin': (data: { visitId: string; technicianName: string; siteName: string }) => void;
  'photos-uploaded': (data: { visitId: string; type: 'arrival' | 'departure'; count: number }) => void;
  'step-approved': (data: { visitId: string; step: string }) => void;
  'step-declined': (data: { visitId: string; step: string; reason: string }) => void;
  'new-comment': (data: { visitId: string; comment: unknown }) => void;
  'visit-updated': (data: { visitId: string; visit: unknown }) => void;
}

export interface ClientToServerEvents {
  'join-visit': (visitId: string) => void;
  'leave-visit': (visitId: string) => void;
  'join-admin': () => void;
}
