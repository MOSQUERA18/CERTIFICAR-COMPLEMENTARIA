    import { chromium } from "playwright";
    import dotenv from "dotenv";

    dotenv.config();

    async function iniciar() {

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



    }

    iniciar();