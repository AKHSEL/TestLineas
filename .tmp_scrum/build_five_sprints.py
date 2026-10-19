from copy import deepcopy
from datetime import date, datetime, time, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(r"C:\Users\akhse\Desktop\REPO\TestLineas")
TEMPLATE = ROOT / "docs" / "Cronograma_Test_de_Lineas_ProjectLibre.xml"
NS = "http://schemas.microsoft.com/project"
ET.register_namespace("", NS)


def tag(name):
    return f"{{{NS}}}{name}"


def put(parent, name, value):
    child = ET.SubElement(parent, tag(name))
    child.text = str(value)
    return child


def business_days(start, finish):
    day = start
    count = 0
    while day <= finish:
        count += day.weekday() < 5
        day += timedelta(days=1)
    return count


def timestamp(day, clock):
    return datetime.combine(day, clock).isoformat(timespec="seconds")


SPRINTS = [
    {
        "number": 1,
        "title": "SPRINT 1: ACCESO AL SISTEMA Y PACIENTES",
        "filename": "Sprint_1_Acceso_Sistema_Pacientes_ProjectLibre.xml",
        "start": "2026-08-10", "finish": "2026-08-21",
        "work": [
            ("H.U. 1: Implementar el inicio de sesión del profesional", "2026-08-11", "2026-08-12", 2),
            ("H.U. 1: Registrar, buscar y actualizar pacientes; validar duplicados", "2026-08-13", "2026-08-17", 3),
            ("H.U. 2: Generar enlaces de evaluación de 24 horas y un solo uso", "2026-08-18", "2026-08-20", 3),
        ],
    },
    {
        "number": 2,
        "title": "SPRINT 2: APLICACIÓN DE LA PRUEBA",
        "filename": "Sprint_2_Aplicacion_Prueba_ProjectLibre.xml",
        "start": "2026-08-24", "finish": "2026-09-04",
        "work": [
            ("H.U. 2: Aceptar consentimiento y registrar datos del participante", "2026-08-25", "2026-08-26", 2),
            ("H.U. 2: Registrar en el servidor la hora de aceptación", "2026-08-27", "2026-08-28", 2),
            ("H.U. 3: Presentar y ordenar nueve estímulos por selección o arrastre", "2026-08-31", "2026-09-03", 4),
        ],
    },
    {
        "number": 3,
        "title": "SPRINT 3: CONTROL DE EVALUACIONES",
        "filename": "Sprint_3_Control_Evaluaciones_ProjectLibre.xml",
        "start": "2026-09-07", "finish": "2026-09-18",
        "work": [
            ("H.U. 3: Validar la secuencia y calcular resultados y tiempos", "2026-09-08", "2026-09-11", 4),
            ("H.U. 4: Guardar respuestas y resultados asociados al paciente", "2026-09-14", "2026-09-15", 2),
            ("H.U. 4: Registrar confirmación y resultado disponible; cerrar enlace", "2026-09-16", "2026-09-16", 1),
            ("H.U. 5: Implementar consulta y búsqueda de evaluaciones", "2026-09-17", "2026-09-17", 1),
        ],
    },
    {
        "number": 4,
        "title": "SPRINT 4: INFORMES E IMPORTACIÓN DE PRUEBAS",
        "filename": "Sprint_4_Informes_Importacion_ProjectLibre.xml",
        "start": "2026-09-21", "finish": "2026-10-02",
        "work": [
            ("H.U. 5: Mostrar historial y comparación de resultados", "2026-09-22", "2026-09-22", 1),
            ("H.U. 6: Preparar informe para impresión o PDF", "2026-09-23", "2026-09-23", 1),
            ("H.U. 6: Exportar resultados e historial a Excel", "2026-09-24", "2026-09-24", 1),
            ("H.U. 7: Analizar PDF y detectar los nueve valores", "2026-09-25", "2026-09-29", 3),
            ("H.U. 7: Revisar y corregir valores detectados", "2026-09-30", "2026-09-30", 1),
            ("H.U. 7: Guardar evaluación importada en el historial", "2026-10-01", "2026-10-01", 1),
        ],
    },
    {
        "number": 5,
        "title": "SPRINT 5: REPORTES DE TIEMPOS PARA TESIS",
        "filename": "Sprint_5_Reportes_Tiempos_Tesis_ProjectLibre.xml",
        "start": "2026-10-05", "finish": "2026-10-16",
        "work": [
            ("H.U. 8: Consultar momentos y calcular intervalos de evaluación", "2026-10-06", "2026-10-08", 3),
            ("H.U. 8: Implementar panel Tesis con horas y duraciones", "2026-10-09", "2026-10-13", 3),
            ("H.U. 8: Exportar tiempos de Tesis a Excel con hora de Lima", "2026-10-14", "2026-10-15", 2),
        ],
    },
]


def add_task(collection, uid, name, first, last, level, summary=False, predecessor=None):
    start, finish = date.fromisoformat(first), date.fromisoformat(last)
    days = business_days(start, finish)
    task = ET.SubElement(collection, tag("Task"))
    fields = [
        ("UID", uid), ("ID", uid), ("Name", name), ("Type", 0), ("IsNull", 0),
        ("WBS", "0" if level == 0 else "1" if level == 1 else f"1.{uid - 1}"),
        ("OutlineNumber", "0" if level == 0 else "1" if level == 1 else f"1.{uid - 1}"),
        ("OutlineLevel", level),
        ("Start", timestamp(start, time(8, 0))),
        ("Finish", timestamp(finish, time(17, 0))),
        ("Duration", f"PT{days * 8}H0M0S"),
        ("DurationFormat", 7), ("Milestone", 0), ("Summary", int(summary)),
        ("CalendarUID", 1),
    ]
    for key, value in fields:
        put(task, key, value)
    if predecessor is not None:
        link = ET.SubElement(task, tag("PredecessorLink"))
        put(link, "PredecessorUID", predecessor)
        put(link, "Type", 1)


for sprint in SPRINTS:
    root = deepcopy(ET.parse(TEMPLATE).getroot())
    first = date.fromisoformat(sprint["start"])
    last = date.fromisoformat(sprint["finish"])
    root.find(tag("Name")).text = sprint["title"]
    root.find(tag("Title")).text = sprint["title"]
    root.find(tag("Subject")).text = "Sprint del proyecto Test de Líneas"
    root.find(tag("StartDate")).text = timestamp(first, time(8, 0))
    root.find(tag("FinishDate")).text = timestamp(last, time(17, 0))
    collection = root.find(tag("Tasks"))
    collection.clear()
    add_task(collection, 0, sprint["title"], sprint["start"], sprint["finish"], 0, summary=True)
    add_task(collection, 1, sprint["title"], sprint["start"], sprint["finish"], 1, summary=True)
    add_task(collection, 2, "Planificación del sprint", sprint["start"], sprint["start"], 2)
    previous = 2
    total = 0
    for name, start, finish, estimate in sprint["work"]:
        measured = business_days(date.fromisoformat(start), date.fromisoformat(finish))
        if measured != estimate:
            raise ValueError(f"{name}: {measured} != {estimate}")
        uid = previous + 1
        add_task(collection, uid, name, start, finish, 2, predecessor=previous)
        previous = uid
        total += estimate
    if total != 8:
        raise ValueError(f"Sprint {sprint['number']} has {total} work days")
    add_task(collection, previous + 1, "Revisión y retrospectiva del sprint", sprint["finish"], sprint["finish"], 2, predecessor=previous)
    if business_days(first, last) != 10:
        raise ValueError(f"Sprint {sprint['number']} does not last 10 work days")
    ET.indent(root, space="  ")
    output = ROOT / "docs" / sprint["filename"]
    ET.ElementTree(root).write(output, encoding="utf-8", xml_declaration=True)
    print(f"{output} | {len(collection)} tasks | 8 implementation days | 10 sprint days")
