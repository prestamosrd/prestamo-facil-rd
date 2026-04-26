import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [clientes, setClientes] = useState(() => {
    return JSON.parse(localStorage.getItem("clientesPrestamos") || "[]");
  });

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    monto: "",
    cuotas: 15,
    ganancia: 60,
    mora: 1,
    fechaInicio: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    localStorage.setItem("clientesPrestamos", JSON.stringify(clientes));
  }, [clientes]);

  const dinero = (valor) =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP"
    }).format(valor || 0);

  const diasEntre = (f1, f2) => {
    const d1 = new Date(f1 + "T00:00:00");
    const d2 = new Date(f2 + "T00:00:00");
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  };

  const fechaCuota = (inicio, num) => {
    const f = new Date(inicio + "T00:00:00");
    f.setDate(f.getDate() + num * 7);
    return f.toISOString().slice(0, 10);
  };

  const calcularMora = (cliente) => {
    const hoy = new Date().toISOString().slice(0, 10);
    const pagado = cliente.pagado * cliente.pagoSemanal;
    const saldoPendiente = Math.max(cliente.total - pagado, 0);

    let moraTotal = 0;

    for (let i = cliente.pagado + 1; i <= cliente.cuotas; i++) {
      const vencimiento = fechaCuota(cliente.fechaInicio, i);
      const dias = diasEntre(vencimiento, hoy);

      if (dias > 0 && saldoPendiente > 0) {
        moraTotal += dias * (saldoPendiente * (cliente.mora / 100));
      }
    }

    return { moraTotal, saldoPendiente };
  };

  const guardar = () => {
    if (!form.nombre || !form.telefono || !form.monto || !form.cuotas) {
      alert("Completa todos los campos");
      return;
    }

    const monto = Number(form.monto);
    const total = monto * (1 + form.ganancia / 100);
    const pagoSemanal = total / form.cuotas;

    const nuevo = {
      id: Date.now(),
      ...form,
      monto,
      total,
      pagoSemanal,
      pagado: 0
    };

    setClientes([nuevo, ...clientes]);

    setForm({
      nombre: "",
      telefono: "",
      monto: "",
      cuotas: 15,
      ganancia: 60,
      mora: 1,
      fechaInicio: new Date().toISOString().slice(0, 10)
    });
  };

  const pagar = (id) => {
    setClientes(clientes.map(c =>
      c.id === id ? { ...c, pagado: Math.min(c.pagado + 1, c.cuotas) } : c
    ));
  };

  // 🔥 NUEVO: RECIBO POR WHATSAPP
  const whatsapp = (cliente) => {
    const data = calcularMora(cliente);
    const pagado = cliente.pagado * cliente.pagoSemanal;
    const pendiente = data.saldoPendiente + data.moraTotal;

    let tel = cliente.telefono.replace(/\D/g, "");
    if (tel.length === 10 && !tel.startsWith("1")) tel = "1" + tel;

    const mensaje = encodeURIComponent(
`🧾 *RECIBO DE PAGO*

👤 Cliente: ${cliente.nombre}
📞 Teléfono: ${cliente.telefono}

💰 Monto: ${dinero(cliente.monto)}
📊 Total: ${dinero(cliente.total)}

💵 Cuota: ${dinero(cliente.pagoSemanal)}
✅ Pagadas: ${cliente.pagado}/${cliente.cuotas}

⚠️ Mora: ${dinero(data.moraTotal)}
📉 Pendiente: ${dinero(pendiente)}

🙏 Gracias por su pago.`
    );

    window.open(`https://wa.me/${tel}?text=${mensaje}`, "_blank");
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Préstamo Fácil</h1>

      <h2>Nuevo préstamo</h2>
      <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}/>
      <input placeholder="Teléfono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}/>
      <input placeholder="Monto" type="number" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})}/>
      <input placeholder="Cuotas" type="number" value={form.cuotas} onChange={e => setForm({...form, cuotas: e.target.value})}/>
      <input placeholder="% Ganancia" type="number" value={form.ganancia} onChange={e => setForm({...form, ganancia: e.target.value})}/>
      <input placeholder="% Mora diaria" type="number" value={form.mora} onChange={e => setForm({...form, mora: e.target.value})}/>
      <input type="date" value={form.fechaInicio} onChange={e => setForm({...form, fechaInicio: e.target.value})}/>
      
      <button onClick={guardar}>Guardar préstamo</button>

      {clientes.map(c => {
        const data = calcularMora(c);
        const pagado = c.pagado * c.pagoSemanal;
        const pendiente = data.saldoPendiente + data.moraTotal;

        return (
          <div key={c.id} style={{ border: "1px solid #ccc", padding: 10, marginTop: 10 }}>
            <h3>{c.nombre}</h3>
            <p>Monto: {dinero(c.monto)}</p>
            <p>Pagado: {dinero(pagado)}</p>
            <p>Mora: {dinero(data.moraTotal)}</p>
            <p>Pendiente: {dinero(pendiente)}</p>

            <button onClick={() => pagar(c.id)}>Pagar cuota</button>
            <button onClick={() => whatsapp(c)}>Enviar recibo</button>
          </div>
        );
      })}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
