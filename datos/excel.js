import XLSX from "xlsx";

export function leerFichas() {

    const ruta = "./datos/Fichas.xlsx";

    const workbook = XLSX.readFile(ruta);

    const nombreHoja = workbook.SheetNames[0];

    const hoja = workbook.Sheets[nombreHoja];

    const datos = XLSX.utils.sheet_to_json(hoja);

    const fichas = datos
        .map(fila => fila.Fichas)
        .filter(ficha => ficha !== undefined && ficha !== null && ficha !== "");

    return fichas;
}