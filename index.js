    import { chromium } from "playwright";
    import dotenv from "dotenv";
    import { leerFichas } from "./datos/excel.js";

    dotenv.config();

    async function iniciar() {

        const fichas = leerFichas();

        console.log("Fichas encontradas:", fichas);


        // =========================
        // ABRIR NAVEGADOR
        // =========================

        const browser = await chromium.launch({
            headless: false,
            slowMo: 500
        });

        const page = await browser.newPage();


        // =========================
        // ABRIR SOFIA PLUS
        // =========================

        await page.goto(
            "http://senasofiaplus.edu.co/sofia-public/"
        );

        await page.waitForTimeout(3000);


        // =========================
        // FORMULARIO DE INGRESO
        // =========================

        const frame = page.frameLocator(
            "#registradoBox1"
        );


        // =========================
        // USUARIO
        // =========================

        await frame.locator("#username")
            .fill(process.env.USUARIO);


        // =========================
        // CONTRASEÑA
        // =========================

        await frame.locator(
            'input[name="josso_password"]'
        )
        .fill(process.env.PASSWORD);


        console.log("Usuario y contraseña colocados correctamente.");



            await frame.locator(
        'input[name="ingresar"]'
    )
    .click();



    await page.waitForTimeout(5000);


        // =========================
    // SELECCIONAR ROL
    // =========================


    await page.locator(
        "#seleccionRol\\:roles"
    )
    .selectOption("18");



    await page.waitForLoadState(
        "networkidle"
    );


    await page.waitForTimeout(3000);

    
    // =========================
    // PRIMER CERTIFICACIÓN
    // =========================

    await page.locator(
        "span.menuPrimario",
        {
            hasText: "Certificación"
        }
    ).click();

    await page.waitForTimeout(1000);
    
    // =========================
    // SEGUNDO CERTIFICACIÓN
    // =========================

    const menuCertificacion = page.locator(
        "li.active"
    ).filter({
        has: page.locator(
            "span.menuPrimario",
            {
                hasText: "Certificación"
            }
        )
    });

    await menuCertificacion.locator(
        "ul.nav-second-level > li:first-child > a"
    ).click();

    await page.waitForTimeout(1000);


    // =========================
    // CERTIFICAR FORMACIÓN COMPLEMENTARIA
    // =========================

    await page.locator(
        '[id="92146Opcion"]'
    ).click();

    await page.waitForTimeout(2000);

    // =========================
    // FRAME CONTENIDO
    // =========================

    const frame1 = page.frameLocator("#contenido");


    // =========================
    // ABRIR CONSULTA DE FICHA
    // =========================

    await frame1.locator(
        '[id="frmContenido:cmdlnkFicha"]'
    ).click();

    await page.waitForTimeout(2000);



    const numeroFicha = fichas[0];

    console.log("Ficha a consultar:", numeroFicha);

    // =========================
    // BUSCAR FRAME DE LA MODAL
    // =========================

    const modalFrame = page.frames().find(
        frame =>
            frame.name() === "modalDialogContentvFichas"
    );

    if (!modalFrame) {
        throw new Error(
            "No se encontró el modal de búsqueda de ficha"
        );
    }


    // =========================
    // INPUT CÓDIGO DE FICHA
    // =========================

    const inputFicha = modalFrame.locator(
        "#form\\:codigoFichaITX"
    );

    await inputFicha.waitFor({
        state: "attached",
        timeout: 10000
    });


    // =========================
    // COLOCAR NÚMERO DE FICHA
    // =========================

    await inputFicha.fill(
        String(numeroFicha)
    );

    console.log(
        "Ficha colocada en el input:",
        numeroFicha
    );

    const btnBuscar =
        modalFrame.locator(
            "#form\\:buscarCBT"
        );



    await btnBuscar.click();

        // =========================
    // SELECCIONAR RESULTADO
    // =========================


    const btnSeleccionar =
    modalFrame.locator(
        "#form\\:dtFichas\\:0\\:cmdlnkShow"
    );



    await btnSeleccionar.waitFor({

        state:"attached",

        timeout:15000

    });



    await btnSeleccionar.click();

    // =========================
    // CONSULTAR APRENDICES
    // =========================

    const btnConsultarAprendices = frame1.locator(
        "#frmContenido\\:cmdlnkSearchPrograma"
    );

    await btnConsultarAprendices.waitFor({
        state: "visible",
        timeout: 10000
    });

    await btnConsultarAprendices.click();

    console.log("Botón 'Consultar Aprendices' presionado.");

    await page.waitForTimeout(2000);


    // =========================
    // SELECCIONAR "GENERAR DOCUMENTO"
    // PARA TODOS LOS APRENDICES
    // =========================

    const selectsGenerarDocumento = frame1.locator(
        'select[id*=":selOpcionAprobacion"]'
    );

    const cantidadAprendices = await selectsGenerarDocumento.count();

    console.log(
        `Aprendices encontrados: ${cantidadAprendices}`
    );

    for (let i = 0; i < cantidadAprendices; i++) {

        const select = selectsGenerarDocumento.nth(i);

        await select.waitFor({
            state: "visible",
            timeout: 10000
        });

        await select.selectOption(
            "GENERAR_DOCUMENTO"
        );

        console.log(
            `Aprendiz ${i + 1}: Generar Documento seleccionado`
        );

        await page.waitForTimeout(1000);
    }





    }

    iniciar();