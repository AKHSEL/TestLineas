from copy import deepcopy
from pathlib import Path
from docx import Document
from docx.oxml.ns import qn

root = Path(r"C:\Users\akhse\Desktop\REPO\TestLineas")
reference = Path(r"C:\Users\akhse\Downloads\Metodologia SCRUM - Modelo 1 (1).docx")
output = root / "docs" / "Metodologia_Scrum_Test_de_Lineas_Base.docx"
doc = Document(reference)
source = list(doc.paragraphs)
body = doc.element.body
end_cover = source[31]._element
children = list(body)
for element in children[children.index(end_cover) + 1:]:
    if element.tag != qn("w:sectPr"):
        body.remove(element)

def set_text(element, value):
    texts = element.xpath(".//w:t")
    if texts:
        texts[0].text = value
        for item in texts[1:]:
            item.text = ""
    else:
        run = element.makeelement(qn("w:r"))
        t = run.makeelement(qn("w:t"))
        t.text = value
        run.append(t)
        element.append(run)

def append_source(index, text=None, blank=False):
    element = deepcopy(source[index]._element)
    if blank:
        for child in list(element):
            if child.tag != qn("w:pPr"):
                element.remove(child)
    elif text is not None:
        set_text(element, text)
    body.insert(len(body) - 1, element)
    return element

for index, value in {
    10: "ANÁLISIS, DISEÑO Y DESARROLLO DEL SISTEMA WEB",
    12: "Sistema web para la aplicación y seguimiento del Test de Líneas",
    16: "Axel Kevin Huaman Solis",
    30: "LIMA – PERÚ 2026",
}.items():
    set_text(source[index]._element, value)

append_source(32)
append_source(33, blank=True)
append_source(34)
append_source(115, blank=True)
append_source(116)
append_source(334, blank=True)
for index in range(335, 347):
    append_source(index)

append_source(347, "1 Alcance del producto")
append_source(348)
sections = [
 ("1.1 Propósito del sistema",
  "Test de Líneas es una plataforma web para aplicar una evaluación visual de nueve estímulos. El profesional invita al paciente mediante un enlace; el paciente acepta participar, registra sus datos y ordena las imágenes según su preferencia. El sistema calcula y conserva los resultados para su revisión profesional."),
 ("1.2 Usuarios y partes interesadas",
  "El paciente realiza la prueba desde el enlace recibido. El profesional inicia sesión, administra fichas de pacientes, genera invitaciones y consulta resultados, informes e historial. Las personas que asumirán Product Owner, Scrum Master y equipo de desarrollo deberán identificarse antes de completar los apartados de roles y planificación."),
 ("1.3 Alcance funcional actual",
  "El sistema registra pacientes, permite crear enlaces de evaluación y solicita consentimiento antes de iniciar. Admite ordenar los nueve estímulos, conservar temporalmente el avance y registrar tiempos de respuesta. Calcula interpretaciones, guarda evaluaciones, muestra la evolución del paciente y permite imprimir informes o exportar datos a Excel. También importa pruebas en PDF de la plantilla prevista: detecta los nueve valores y exige revisarlos antes de guardar."),
 ("1.4 Límites del producto",
  "El resultado automático sirve de apoyo y no constituye por sí mismo un diagnóstico. El paciente no ve la interpretación en su dispositivo. La importación de PDF se limita a la plantilla esperada de una página y a archivos de hasta 10 MB. El alcance identificado no incluye facturación, teleconsulta ni integración con historias clínicas externas."),
]
for heading, summary in sections:
    append_source(351, heading)
    append_source(352)
    append_source(353, summary)
append_source(368, blank=True)
for index in range(452, 463):
    append_source(index)
for index in range(589, 600):
    append_source(index)

body.remove(body[-1])
body.append(deepcopy(source[600]._element.xpath("./w:pPr/w:sectPr")[0]))
doc.core_properties.author = "Axel Kevin Huaman Solis"
doc.core_properties.last_modified_by = "Axel Kevin Huaman Solis"
doc.core_properties.title = "Metodología Scrum para Test de Líneas"
doc.save(output)
print(output)

