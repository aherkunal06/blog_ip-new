export interface Event {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  image: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  eventUrl: string | null;
  status: "upcoming" | "live" | "past";
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

