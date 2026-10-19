"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { DOCUMENT_TYPE_LABELS, maskDocument, normalizeDocument, type DocumentType } from "@/lib/patients";

export type Patient = {
  id: string;
  nombre: string;
  apellido: string;
  document_type: DocumentType | null;
  document_number: string | null;
  evaluation_count: number;
  last_evaluation_at: string | null;
};

type ApiError = { error?: string; code?: string; patient_id?: string };

async function readJson<T>(response: Response) {
  return response.json().catch(() => null) as Promise<T | null>;
}

export function PatientList({
  patients,
  loading,
  query,
  preview = false,
}: {
  patients: Patient[];
  loading: boolean;
  query?: string;
  preview?: boolean;
}) {
  const normalizedQuery = (query ?? "").trim().toLocaleLowerCase("es");
  const filteredPatients = useMemo(() => {
    if (!normalizedQuery) return patients;
    const normalizedDocument = normalizeDocument(query ?? "");
    return patients.filter((patient) =>
      `${patient.nombre} ${patient.apellido}`.toLocaleLowerCase("es").includes(normalizedQuery)
      || Boolean(normalizedDocument && patient.document_number?.includes(normalizedDocument)),
    );
  }, [normalizedQuery, patients, query]);
  const visiblePatients = preview
    ? [...filteredPatients].sort((a, b) => {
      const aDate = a.last_evaluation_at ?? "";
      const bDate = b.last_evaluation_at ?? "";
      return bDate.localeCompare(aDate) || `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es");
    }).slice(0, 5)
    : filteredPatients;

  if (loading) return <LoadingRows />;
  if (visiblePatients.length === 0) {
    return <EmptyState title={normalizedQuery ? "Sin coincidencias" : "Aún no hay pacientes"} copy={normalizedQuery ? "Prueba con otro nombre o documento." : "Crea la primera ficha para comenzar el seguimiento."} />;
  }

  return (
    <div className="divide-y divide-outline-variant/25">
      {visiblePatients.map((patient) => (
        <article key={patient.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="font-bold">{patient.nombre} {patient.apellido}</h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              {patient.document_type ? `${DOCUMENT_TYPE_LABELS[patient.document_type]} ${maskDocument(patient.document_number)} · ` : ""}
              {patient.evaluation_count} {patient.evaluation_count === 1 ? "evaluación" : "evaluaciones"}
              {patient.last_evaluation_at && ` · Última: ${new Date(patient.last_evaluation_at).toLocaleDateString("es-PE", { dateStyle: "medium" })}`}
            </p>
          </div>
          <Link href={`/doctor/patients/${patient.id}`} className="button-primary">Ver seguimiento</Link>
        </article>
      ))}
    </div>
  );
}

export function PatientRegistrationForm({ onCreated }: { onCreated?: (patient: Patient) => void }) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("dni");
  const [documentNumber, setDocumentNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/doctor/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellido, document_type: documentNumber.trim() ? documentType : null, document_number: documentNumber }),
      });
      const data = await readJson<Patient & ApiError>(response);
      if (response.status === 409 && data?.code === "DUPLICATE_PATIENT" && data.patient_id) {
        window.location.assign(`/doctor/patients/${data.patient_id}`);
        return;
      }
      if (!response.ok || !data?.id) throw new Error(data?.error || "No se pudo crear la ficha.");
      onCreated?.(data);
      window.location.assign(`/doctor/patients/${data.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la ficha.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="clinical-card overflow-hidden" aria-labelledby="new-patient-title">
      <div className="border-b border-outline-variant/25 px-5 py-5 sm:px-6">
        <p className="eyebrow">Nueva ficha</p>
        <h2 id="new-patient-title" className="mt-1 text-xl font-bold">Registrar paciente</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Después podrás generar un enlace de evaluación desde su ficha.</p>
      </div>
      <form onSubmit={createPatient} className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1fr_1fr_190px_1fr_auto] lg:items-end">
        <label><span className="clinical-label">Nombre</span><input required maxLength={80} value={nombre} onChange={(event) => setNombre(event.target.value)} className="clinical-input" /></label>
        <label><span className="clinical-label">Apellido</span><input required maxLength={80} value={apellido} onChange={(event) => setApellido(event.target.value)} className="clinical-input" /></label>
        <label><span className="clinical-label">Tipo de documento</span><select value={documentType} onChange={(event) => setDocumentType(event.target.value as DocumentType)} className="clinical-input"><option value="dni">DNI</option><option value="ce">Carné de extranjería</option><option value="passport">Pasaporte</option></select></label>
        <label><span className="clinical-label">Número (opcional)</span><input inputMode={documentType === "dni" ? "numeric" : "text"} maxLength={18} value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} placeholder={documentType === "dni" ? "8 dígitos" : "6 a 15 caracteres"} className="clinical-input" /></label>
        <button disabled={creating} className="button-primary">{creating ? "Creando…" : "Crear ficha"}</button>
      </form>
      {error && <p className="px-5 pb-5 text-sm font-semibold text-error sm:px-6">{error}</p>}
    </section>
  );
}

export function LoadingRows() {
  return <div className="space-y-3 p-5 sm:p-6" aria-label="Cargando"><div className="h-14 animate-pulse rounded-lg bg-surface-container-low" /><div className="h-14 animate-pulse rounded-lg bg-surface-container-low" /></div>;
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="px-6 py-12 text-center"><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm text-on-surface-variant">{copy}</p></div>;
}
