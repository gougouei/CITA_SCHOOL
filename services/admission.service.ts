import { createClient } from "@/lib/supabase";
import type { AdmissionRequest } from "@/types";

interface AdmissionFormData {
  last_name: string;
  first_name: string;
  date_of_birth: string;
  country_of_birth?: string;
  country_of_residence: string;
  marital_status?: AdmissionRequest["marital_status"];
  occupation?: string;
  how_discovered?: string;
  motivation: string;
}

export const AdmissionService = {
  async submitAdmission(formData: AdmissionFormData) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("admission_requests")
      .insert({ ...formData, status: "pending" })
      .select()
      .single();

    if (error) throw error;
    return data as AdmissionRequest;
  },
};
