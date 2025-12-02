export interface Task {
  id: string;
  titel: string;
  beskrivelse: string;
  start_dato: string; // ISO date string
  slut_dato: string; // ISO date string
  spor_id: string;
  farve: string;
  ansvarlig_id: string;
  oprettet_af: string;
  oprettet_dato: string;
  _coords?: {
    startAngle: number;
    endAngle: number;
    radius: number;
  };
}

export interface CreateTaskInput {
  titel: string;
  beskrivelse: string;
  start_dato: string;
  slut_dato: string;
  spor_id: string;
  farve: string;
  ansvarlig_id: string;
}
