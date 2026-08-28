import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const settings = await prisma.businessSettings.findFirst();
  return {
    title: `Términos y Condiciones — ${settings?.businessName ?? "BarberService"}`,
    description: "Términos y condiciones de uso del servicio de reserva y contratación de servicios de barbería.",
  };
}

const headingClasses = "font-display text-3xl font-semibold uppercase tracking-tight text-zinc-950 dark:text-white md:text-4xl";
const subheadingClasses = "font-display mt-10 mb-3 text-lg font-medium uppercase tracking-tight text-zinc-900 dark:text-zinc-100";
const bodyClasses = "mt-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400";

export default async function TerminosPage() {
  const settings = await prisma.businessSettings.findFirst();
  const businessName = settings?.businessName ?? "BarberService";
  const year = new Date().getFullYear();

  return (
    <div>
      <h1 className={headingClasses}>Términos y Condiciones</h1>

      <p className={bodyClasses}>
        Los presentes Términos y Condiciones ("Términos") regulan el uso de la plataforma digital de{" "}
        <strong>{businessName}</strong> (en adelante, el "Negocio"), incluyendo su sitio web, sistema de reservas en línea
        y los servicios de barbería prestados de manera presencial ("Servicios"). Al reservar una cita o contratar un Servicio,
        usted ("Cliente") acepta plena y voluntariamente estos Términos. Si no está de acuerdo, le solicitamos no utilizar la plataforma.
      </p>

      {/* 1. Objeto y alcance */}
      <h2 className={subheadingClasses}>1. Objeto y Alcance</h2>
      <p className={bodyClasses}>
        Estos Términos tienen por objeto establecer las reglas que rigen el acceso y uso del sistema de reservas en línea
        proporcionado por {businessName}, así como las condiciones para la prestación de los Servicios de barbería y estética
        personal ofrecidos. La plataforma permite al Cliente seleccionar servicios, barberos, fecha y horario, confirmando su
        reserva de manera digital.
      </p>
      <p className={bodyClasses}>
        En cumplimiento con lo dispuesto por la Ley para la Defensa del Consumidor (arts. 1, 2 y 3), se garantiza información
        clara, suficiente y veraz sobre los Servicios ofrecidos, sus precios, duración y condiciones de contratación.
      </p>

      {/* 2. Capacidad y registro */}
      <h2 className={subheadingClasses}>2. Capacidad Legal y Registro</h2>
      <p className={bodyClasses}>
        Para utilizar la plataforma de reservas, el Cliente debe ser mayor de edad conforme a la legislación venezolana
        (Código Civil, Art. 128) o contar con representación legal. Los menores de edad mayores de 14 años podrán asistir a un
        servicio únicamente con autorización expresa de su padre, madre o representante legal, de conformidad con la Ley Orgánica
        para la Protección del Niño, Niña y Adolescente (LOPNA).
      </p>
      <p className={bodyClasses}>
        Al crear una cuenta o realizar una reserva, el Cliente declara bajo juramento ser titular veraz de los datos personales
        proporcionados. La provisión de información falsa constituye causal de cancelación inmediata de la reserva.
      </p>

      {/* 3. Reservas y confirmación */}
      <h2 className={subheadingClasses}>3. Reservas y Confirmación</h2>
      <p className={bodyClasses}>
        Una vez completada la reserva en la plataforma, se enviará una confirmación al correo electrónico o número de teléfono
        proporcionado por el Cliente. Esta confirmación constituye aceptación mutua del contrato de servicios entre el Negocio y
        el Cliente, en los términos establecidos en los arts. 1.544 y siguientes del Código Civil venezolano sobre formación del
        consentimiento.
      </p>
      <p className={bodyClasses}>
        El Negocio se reserva el derecho de reprogramar una cita previa consulta con el Cliente en casos de fuerza mayor,
        enfermedad del barbero asignado u otras causas justificadas debidamente comunicadas.
      </p>

      {/* 4. Precios y pagos */}
      <h2 className={subheadingClasses}>4. Precios y Forma de Pago</h2>
      <p className={bodyClasses}>
        Los precios publicados en la plataforma se expresan en la moneda indicada ({settings?.currency ?? "USD"}) e incluyen
        todos los impuestos aplicables. El Negocio se compromete a respetar el precio publicado al momento de la reserva, en
        cumplimiento del art. 61 de la Constitución de la República Bolivariana de Venezuela y de la Ley para la Defensa del
        Consumidor en materia de publicidad y precios.
      </p>
      <p className={bodyClasses}>
        Las formas de pago aceptadas serán comunicadas al momento de la confirmación de la reserva. Una vez realizado el pago,
        se emitirá un comprobante de compra conforme a lo establecido en la Ley de Impuestos sobre las Ventas (IVS) y la
        Providencia n.° SNAT/2017/00409 (código de facturación electrónica).
      </p>

      {/* 5. Cancelaciones y reembolso */}
      <h2 className={subheadingClasses}>5. Cancelaciones y Reembolsos</h2>
      <p className={bodyClasses}>
        El Cliente podrá cancelar o reprogramar su reserva sin costo siempre que lo haga con al menos <strong>24 horas de
        antelación</strong> al horario establecido. Cancelaciones con menos de 24 horas de anticipación podrán estar sujetas a
        una penalización equivalente hasta el 100% del valor del servicio, salvo causa de fuerza mayor acreditada.
      </p>
      <p className={bodyClasses}>
        En caso de cancelación por parte del Negocio, se procederá al reembolso completo del monto pagado en un plazo no mayor
        a <strong>10 días hábiles</strong>, de conformidad con el art. 30 de la Ley para la Defensa del Consumidor, que garantiza
        el derecho a la devolución de importías cuando no se presta el servicio contratado.
      </p>

      {/* 6. Propiedad intelectual */}
      <h2 className={subheadingClasses}>6. Propiedad Intelectual</h2>
      <p className={bodyClasses}>
        Todos los elementos de la plataforma —incluyendo logotipos, diseños, textos, código fuente, bases de datos, imágenes y
        elementos gráficos— son propiedad exclusiva de {businessName} o de sus respectivos licenciantes, y están protegidos por las
        leyes venezolanas de propiedad intelectual, en particular la Ley de Derecho de Autor (Gaceta Oficial N.° 3.3027 de fecha
        29 de diciembre de 2008, modificada por la Ley de Derecho de Autor publicada en Gaceta Oficial N.° 6.009 Extraordinaria el
        23 de julio de 2008), así por el Convenio de Berna para la Protección de las Obras Literarias y Artísticas, del cual
        Venezuela es Estado Parte.
      </p>
      <p className={bodyClasses}>
        Queda prohibida la reproducción, distribución, modificación pública o transformación de cualquiera de estos elementos sin
        autorización expresa y por escrito del Negocio.
      </p>

      {/* 7. Uso indebido */}
      <h2 className={subheadingClasses}>7. Prohibiciones y Uso Indebido</h2>
      <p className={bodyClasses}>
        El Cliente se compromete a utilizar la plataforma de manera responsable y de conformidad con la ley. Queda estrictamente
        prohibido:
      </p>
      <ul className="list-disc pl-6 mt-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 space-y-1">
        <li>Utilizar datos personales de terceros sin su consentimiento.</li>
        <li>Generar reservas fraudulentas o con intención de incurrir en dolo o daño al Negocio.</li>
        <li>Intentar acceder, manipular o alterar el funcionamiento técnico de la plataforma.</li>
        <li>Hacer uso de la plataforma para actividades ilícitas contrarias a la ley, la moral o el orden público (art. 1.186, Código Civil).</li>
      </ul>
      <p className={bodyClasses}>
        El incumplimiento de estas prohibiciones dará lugar a la suspensión inmediata de la cuenta y a las acciones legales que
        correspondan conforme a la legislación civil y penal vigente en la República Bolivariana de Venezuela.
      </p>

      {/* 8. Exoneración de responsabilidad y garantías del servicio */}
      <h2 className={subheadingClasses}>8. Calidad del Servicio y Exoneración de Responsabilidad</h2>
      <p className={bodyClasses}>
        El Negocio se compromete a prestar los Servicios con la diligencia y profesionalismo propios de un establecimiento de
        barbería de categoría premium. Sin embargo, los resultados estéticos pueden variar según las características individuales
        de cada persona, el estado del cabello, piel o barba del Cliente.
      </p>
      <p className={bodyClasses}>
        El Negocio no será responsable por lesiones, alergias o reacciones adversas derivadas del uso de productos cosméticos, a
        menos que exista demostración de negligencia directa en la aplicación de los mismos. Se recomienda informar previamente
        sobre cualquier condición dermatológica, alergia o restricción médica.
      </p>

      {/* 9. Firmas digitales */}
      <h2 className={subheadingClasses}>9. Comunicaciones Digitales y Firmas Electrónicas</h2>
      <p className={bodyClasses}>
        Todas las comunicaciones realizadas a través de esta plataforma (reservas, confirmaciones, modificaciones, cancelaciones)
        tendrán validez conforme a la Ley de Intercambio Electrónico de Documentos y Firmas Digitales (Gaceta Oficial N.° 38.247 de
        fecha 10 de noviembre de 2004), la cual reconoce la eficacia jurídica de los documentos electrónicos y las firmas digitales
        en los términos allí establecidos.
      </p>
      <p className={bodyClasses}>
        Las confirmaciones y recibos generados digitalmente por esta plataforma constituyen prueba válida de la operación realizada,
        de conformidad con la Providencia Administrativa SUACI 2020/000034 que regula el uso de la firma electrónica avanzada ante el
        SENIAT.
      </p>

      {/* 10. Resolución de conflictos */}
      <h2 className={subheadingClasses}>10. Resolución de Conflictos y Jurisdicción</h2>
      <p className={bodyClasses}>
        En caso de controversia derivada de estos Términos o de la prestación de los Servicios, las partes se comprometen a
        intentar primero una solución negociada y amigable dentro de un plazo de <strong>15 días hábiles</strong>.
      </p>
      <p className={bodyClasses}>
        De no alcanzarse un acuerdo, la controversia se someterá a los tribunales competentes de la ciudad donde se encuentra
        ubicado el Negocio, renunciando expresamente a cualquier otro fuero que pudiera corresponderles conforme al art. 40 del
        Código de Procedimiento Civil. El Cliente Consumerista también podrá acudir al Centro de Conciliación para Consumerista
        conforme a la Ley para la Defensa del Consumidor.
      </p>

      {/* 11. Modificaciones */}
      <h2 className={subheadingClasses}>11. Modificación de los Términos</h2>
      <p className={bodyClasses}>
        {businessName} se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones entrarán en vigor
        desde su publicación en esta página y se aplicarán a las reservas y contrataciones realizadas con posterioridad a dicha
        publicación. Se notificará al Cliente sobre cambios sustanciales mediante correo electrónico o aviso visible en la
        plataforma.
      </p>
      <p className={bodyClasses}>
        El uso continuado de la plataforma después de la publicación de las modificaciones implica la aceptación de las mismas, en
        concordancia con los arts. 1.260 y 1.261 del Código Civil sobre consentimiento tácito.
      </p>

      {/* 12. Legislación aplicable */}
      <h2 className={subheadingClasses}>12. Legislación Aplicable</h2>
      <p className={bodyClasses}>
        Estos Términos se rigen por la legislación de la República Bolivariana de Venezuela. Se aplica, en particular:
      </p>
      <ul className="list-disc pl-6 mt-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 space-y-1">
        <li>Constitución de la República Bolivariana de Venezuela.</li>
        <li>Código Civil (arts. 1.180–1.260 sobre obligaciones y contratos; arts. 1.544–1.625 sobre obligación de hacer).</li>
        <li>Ley para la Defensa del Consumidor (Gaceta Oficial N.° 38.836 de fecha 30 de diciembre de 2007).</li>
        <li>Ley Orgánica para la Protección del Niño, Niña y Adolescente (LOPNA).</li>
        <li>Ley de Derecho de Autor y Ley de Propiedad Industrial.</li>
        <li>Ley de Intercambio Electrónico de Documentos y Firmas Digitales.</li>
        <li>Ley de Impuestos sobre las Ventas (IVS) y normas fiscales aplicables.</li>
      </ul>
    </div>
  );
}
