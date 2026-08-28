import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const settings = await prisma.businessSettings.findFirst();
  return {
    title: `Política de Privacidad — ${settings?.businessName ?? "BarberService"}`,
    description: "Política de privacidad y tratamiento de datos personales en {businessName}.",
  };
}

const headingClasses = "font-display text-3xl font-semibold uppercase tracking-tight text-zinc-950 dark:text-white md:text-4xl";
const subheadingClasses = "font-display mt-10 mb-3 text-lg font-medium uppercase tracking-tight text-zinc-900 dark:text-zinc-100";
const bodyClasses = "mt-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400";

export default async function PrivacidadPage() {
  const settings = await prisma.businessSettings.findFirst();
  const businessName = settings?.businessName ?? "BarberService";

  return (
    <div>
      <h1 className={headingClasses}>Política de Privacidad</h1>

      <p className={bodyClasses}>
        La presente Política de Privacidad ("Política") describe cómo{" "}
        <strong>{businessName}</strong> (en adelante, el "Negocio") recopila, usa, almacena y protege la información personal de
        sus usuarios — tanto clientes del sistema de reservas como visitantes del sitio web. Esta Política se alinea con los
        derechos fundamentales de honor, buen nombre, privacidad e intimidad personal y familiar reconocidos en el Art. 60 de la
        Constitución de la República Bolivariana de Venezuela.
      </p>

      {/* 1. Responsable del tratamiento */}
      <h2 className={subheadingClasses}>1. Responsable del Tratamiento de Datos</h2>
      <p className={bodyClasses}>
        El responsable del tratamiento de los datos personales recopilados a través de esta plataforma es{" "}
        <strong>{businessName}</strong>, con dirección fiscal en {settings?.address ?? "la ciudad donde se encuentra ubicado el Negocio"},
        inscrita en el Registro de Información Tributaria (RIF) bajo el número correspondiente. El Negocio actúa como controlador
        de la base de datos que contiene la información personal de sus clientes.
      </p>

      {/* 2. Datos que recopilamos */}
      <h2 className={subheadingClasses}>2. Datos Personales que Recopilamos</h2>
      <p className={bodyClasses}>Recopilamos únicamente los datos estrictamente necesarios para la prestación de nuestros servicios:</p>
      <ul className="list-disc pl-6 mt-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 space-y-1">
        <li><strong>Datos de identificación:</strong> nombre completo y correo electrónico (al crear una cuenta o reservar).</li>
        <li><strong>Datos de contacto:</strong> número de teléfono celular.</li>
        <li><strong>Datos de la reserva:</strong> servicio solicitado, barbero asignado, fecha y hora de la cita, estado de pago.</li>
        <li><strong>Datos técnicos mínimos:</strong> dirección IP y tipo de navegador (de forma anónima y agregada, vía herramientas de análisis como las proporcionadas por Vercel Analytics, si estuviesen habilitadas).</li>
      </ul>
      <p className={bodyClasses}>
        No solicitamos datos financieros directos (números de tarjeta de crédito/débito) a través de la plataforma. Los pagos
        procesados mediante pasarelas cumplen con estándares PCI-DSS.
      </p>
      <p className={bodyClasses}>
        En cumplimiento del principio de minimización de datos previsto en el art. 9 de la Ley sobre Intercambio Electrónico de
        Documentos y Firmas Digitales, solo recopilamos lo indispensable para cumplir con la finalidad declarada.
      </p>

      {/* 3. Finalidades del tratamiento */}
      <h2 className={subheadingClasses}>3. Finalidades del Tratamiento</h2>
      <p className={bodyClasses}>Sus datos personales serán tratados exclusivamente para las siguientes finalidades:</p>
      <ul className="list-disc pl-6 mt-6 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 space-y-1">
        <li><strong>Gestión de citas y reservas:</strong> programar, confirmar, modificar y cancelar citas en nuestro sistema.</li>
        <li><strong>Comunicación con el Cliente:</strong> enviar recordatorios, confirmaciones, notificaciones sobre el estado de la reserva y actualizaciones del servicio por correo electrónico, SMS o mensajería instantánea.</li>
        <li><strong>Prestación del servicio:</strong> asegurar que el barbero asignado tenga acceso a la información necesaria (servicio preferido, preferencias especiales).</li>
        <li><strong>Cobros y facturación:</strong> emitir comprobantes de compra y facturas conforme a la legislación tributaria venezolana.</li>
        <li><strong>Mejora del servicio:</strong> análisis estadístico interno para optimizar la disponibilidad de turnos, satisfacción del Cliente y calidad del servicio.</li>
        <li><strong>Cumplimiento legal:</strong> dar cumplimiento a obligaciones impuestas por leyes fiscales, consumidor y demás normativa aplicable.</li>
      </ul>

      {/* 4. Base legal del tratamiento */}
      <h2 className={subheadingClasses}>4. Base Legal del Tratamiento</h2>
      <p className={bodyClasses}>El tratamiento de sus datos personales se fundamenta en:</p>
      <ul className="list-disc pl-6 mt-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 space-y-1">
        <li><strong>Consentimiento:</strong> al proporcionar sus datos y utilizar la plataforma, usted otorga su consentimiento libre, informado e inequívoco para el tratamiento descrito en esta Política.</li>
        <li><strong>Ejecución contractual:</strong> el tratamiento es necesario para cumplir con la reserva contratada (art. 1.180, Código Civil).</li>
        <li><strong>Obligación legal:</strong> el procesamiento de datos de facturación responde a obligaciones tributarias establecidas en la Ley de Impuestos sobre las Ventas y la normativa del SENIAT.</li>
        <li><strong>Interés legítimo:</strong> el análisis estadístico anónimo y las mejoras operativas constituyen un interés legítimo del Negocio, sin menoscabo de sus derechos y libertades fundamentales.</li>
      </ul>

      {/* 5. Derechos ARCO y garantías constitucionales */}
      <h2 className={subheadingClasses}>5. Derechos del Titular de los Datos Personales</h2>
      <p className={bodyClasses}>
        De conformidad con el Art. 60 de la Constitución de la República Bolivariana de Venezuela, toda persona tiene derecho a
        conocer, no ser contrariada y rectificar sus datos personales. Asimismo, en atención al marco protector de la Ley para la
        Defensa del Consumidor y los principios de la doctrina sobre protección de datos en Venezuela, usted ejercita los siguientes
        derechos frente a {businessName}:
      </p>
      <ul className="list-disc pl-6 mt-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 space-y-1">
        <li><strong>Derecho de Acceso:</strong> solicitar y recibir copia de los datos personales que tenemos sobre usted.</li>
        <li><strong>Derecho de Rectificación:</strong> solicitar la corrección de datos inexactos, incompletos o extemporáneos.</li>
        <li><strong>Derecho de Supresión (derecho al olvido):</strong> pedir la eliminación de sus datos cuando ya no sean necesarios para las finalidades para las que fueron recogidos.</li>
        <li><strong>Derecho de Oposición:</strong> oponerse al tratamiento de sus datos con fines promocionales o de investigación de mercado.</li>
        <li><strong>Derecho a Portabilidad:</strong> solicitar una copia estructurada de sus datos en formato de intercambio estándar.</li>
      </ul>
      <p className={bodyClasses}>
        Para ejercer cualquiera de estos derechos, puede escribirnos al correo electrónico {settings?.email ?? "[correo del Negocio]"}
        indicando el derecho que desea ejercitar y acompañando copia de su cédula de identidad. Responderemos su solicitud en un plazo
        no mayor a <strong>10 días hábiles</strong>.
      </p>

      {/* 6. Compartimos sus datos? */}
      <h2 className={subheadingClasses}>6. Transferencia y Divulgación de Datos</h2>
      <p className={bodyClasses}>
        {businessName} no venderá, comercializará ni compartirá sus datos personales con terceros con fines comerciales. Podremos
        compartir información exclusivamente en los siguientes casos:
      </p>
      <ul className="list-disc pl-6 mt-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 space-y-1">
        <li><strong>Proveedores de servicios tecnológicos:</strong> plataformas de hosting (Vercel), pasarelas de pago, sistemas de envío de correos/SMS y herramientas de análisis operativo. Estos proveedores están obligados contractualmente a tratar los datos exclusivamente según nuestras instrucciones y con medidas de seguridad adecuadas.</li>
        <li><strong>Obligación legal:</strong> cuando sea requerido por autoridad competente conforme a ley (orden judicial, requerimiento del Ministerio Público, SENIAT u otras autoridades competentes).</li>
        <li><strong>Protección de derechos:</strong> cuando sea necesario para proteger los derechos, la seguridad o la propiedad de {businessName}, nuestros empleados, Clientes o público.</li>
      </ul>

      {/* 7. Seguridad */}
      <h2 className={subheadingClasses}>7. Medidas de Seguridad</h2>
      <p className={bodyClasses}>
        {businessName} adopta medidas técnicas y organizativas razonables para proteger sus datos personales contra acceso no autorizado,
        alteración, pérdida, destrucción o tratamiento ilícito, entre ellas:
      </p>
      <ul className="list-disc pl-6 mt-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 space-y-1">
        <li>Cifrado SSL/TLS en todas las comunicaciones (HTTPS).</li>
        <li>Controles de acceso basados en roles dentro del sistema administrativo.</li>
        <li>Almacenamiento seguro de contraseñas con hashing (bcrypt/argon2).</li>
        <li>Protocolos de respaldo periódico de bases de datos.</li>
        <li>Capacitación periódica al equipo en materia de protección de datos personales.</li>
        <li>Cumplimiento con las mejores prácticas de seguridad de nuestra infraestructura en la nube (proveedor Vercel).</li>
      </ul>

      {/* 8. Retención */}
      <h2 className={subheadingClasses}>8. Período de Conservación de Datos</h2>
      <p className={bodyClasses}>
        Sus datos personales se conservarán durante todo el tiempo que dure la relación contractual con usted (desde el primer uso
        de la plataforma hasta la última interacción activa). Una vez concluida dicha relación, sus datos serán eliminados o anonimizados
        de inmediato, salvo que exista obligación legal de conservarlos por un período mayor. Por ejemplo, los datos de facturación se
        conservarán durante el período establecido por la Ley de Impuesto sobre la Renta (ISLR) y la Ley de Impuestos sobre las Ventas
        (IVS), que establece plazos de prescripción de hasta cinco (5) años.
      </p>

      {/* 9. Menores de edad */}
      <h2 className={subheadingClasses}>9. Protección de Datos de Menores de Edad</h2>
      <p className={bodyClasses}>
        De acuerdo con la Ley Orgánica para la Protección del Niño, Niña y Adolescente (LOPNA), los datos personales de menores de
        edad reciben protección especial. Si un menor de edad nos proporciona datos personales sin la autorización de su padre, madre o
        representante legal, procederemos a eliminarlos tan pronto como tengamos conocimiento de ello.
      </p>
      <p className={bodyClasses}>
        Los menores entre 12 y 18 años pueden asistir al Negocio con fines estéticos siempre que cuenten con la autorización de su
        representante legal. No recopilamos intencionalmente datos de menores de 12 años.
      </p>

      {/* 10. Cookies y tecnologías similares */}
      <h2 className={subheadingClasses}>10. Cookies y Tecnologías Similares</h2>
      <p className={bodyClasses}>
        Este sitio web puede utilizar cookies esenciales para el funcionamiento técnico de la plataforma (sesiones de autenticación,
        preferencias de idioma/tema). Estas cookies son necesarias y no requieren consentimiento previo.
      </p>
      <p className={bodyClasses}>
        En caso de habilitarse herramientas de análisis analítico (por ejemplo, Vercel Web Analytics), estas recopilan datos
        estadísticos agregados y anónimos que no permiten la identificación personal del usuario. Puede consultar la política de
        privacidad del proveedor utilizado para más detalles.
      </p>

      {/* 11. Cambios en la política */}
      <h2 className={subheadingClasses}>11. Actualizaciones de esta Política</h2>
      <p className={bodyClasses}>
        {businessName} se reserva el derecho de actualizar esta Política de Privacidad en cualquier momento. Las modificaciones serán
        publicadas en esta misma página y, cuando afecten finalidades del tratamiento sustancialmente diferentes, se notificará al
        Cliente mediante correo electrónico o aviso destacado en el sitio. Se invita a revisar esta Política periódicamente.
      </p>

      {/* 12. Contacto */}
      <h2 className={subheadingClasses}>12. Contacto</h2>
      <p className={bodyClasses}>
        Para consultas, sugerencias o ejercicio de derechos relacionados con sus datos personales, puede comunicarse con nosotros a
        través de:
      </p>
      <ul className="list-disc pl-6 mt-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 space-y-1">
        <li><strong>Correo electrónico:</strong> {settings?.email ?? "[correo del Negocio]"}</li>
        <li><strong>Teléfono:</strong> {settings?.phone ?? "[teléfono del Negocio]"}</li>
        <li><strong>Dirección física:</strong> {settings?.address ?? "[dirección del Negocio]"}</li>
      </ul>
    </div>
  );
}
