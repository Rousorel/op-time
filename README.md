# ⚡ VAS Tracker Portal

Una aplicación web moderna para el seguimiento y gestión de actividades VAS (Value Added Services) en tiempo real, diseñada para optimizar la productividad y el control operativo.

## 📋 Descripción

VAS Tracker es una herramienta digital que permite a los operadores registrar sus actividades de manera eficiente, mientras que los administradores pueden monitorear métricas clave como UPH (Unidades Por Hora) en tiempo real. La aplicación utiliza Firebase como backend para almacenamiento y sincronización de datos.

## ✨ Características Principales

### 👤 Para Operadores
- **Registro de actividades** en tiempo real
- **Interfaz intuitiva** con selección de actividades predefinidas
- **Seguimiento automático** de tiempos de inicio y fin
- **Historial personal** de actividades realizadas
- **Validación de datos** para asegurar calidad de información

### 👨‍💼 Para Administradores
- **Dashboard en tiempo real** con métricas clave
- **Gestión de usuarios** (agregar, buscar, eliminar)
- **Tabla UPH por usuario** con desglose por horas
- **Filtros avanzados** por fecha, turno, actividad y usuario
- **Exportación a Excel** de reportes
- **Vista de KPIs** generales

### 🔄 Funcionalidades Técnicas
- **Actualización en tiempo real** usando Firebase Firestore
- **Interfaz responsive** optimizada para diferentes dispositivos
- **Almacenamiento local** para persistencia de sesión
- **Validación de formularios** y manejo de errores
- **Diseño moderno** con tema claro y oscuro

## 🚀 Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Firebase Firestore (NoSQL Database)
- **Hosting:** Firebase Hosting (opcional)
- **Librerías:** Firebase SDK v10.12.2 (Compat)
- **Estilos:** CSS Variables, Flexbox, Grid
- **Fuentes:** IBM Plex Sans (Google Fonts)

## 📁 Estructura del Proyecto

```
VAS Tracker Portal/
├── index.html          # Página principal (operadores)
├── admin.html          # Panel de administración
├── css/
│   ├── style.css       # Estilos página principal
│   └── admin.css       # Estilos panel admin
├── js/
│   ├── firebase-config.js  # Configuración Firebase
│   ├── app.js          # Lógica página principal
│   ├── admin.js        # Lógica panel admin
│   ├── data.js         # Operaciones CRUD Firestore
│   └── usuarios.js     # Gestión de usuarios
└── README.md           # Este archivo
```

## 🛠️ Instalación y Configuración

### 1. Clonar o Descargar
```bash
# Clona el repositorio o descarga los archivos
# Asegúrate de tener todos los archivos en la misma estructura
```

### 2. Configurar Firebase

#### Crear Proyecto en Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita **Firestore Database**
4. Configura las **reglas de seguridad** (para desarrollo):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura y escritura para todos (solo para desarrollo)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

#### Actualizar Credenciales
Edita `js/firebase-config.js` con tus credenciales de Firebase:

```javascript
const firebaseConfig = {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 3. Ejecutar la Aplicación

#### Opción A: Abrir directamente en navegador
- Abre `index.html` para la interfaz de operadores
- Abre `admin.html` para el panel de administración

#### Opción B: Usar servidor local (recomendado)
```bash
# Si tienes Python instalado
python -m http.server 8000

# O con Node.js
npx http-server

# Luego abre http://localhost:8000
```

## 📖 Uso de la Aplicación

### 👤 Para Operadores

1. **Inicio de Sesión**
   - Ingresa tu nombre de usuario
   - La aplicación valida que estés registrado

2. **Registro de Actividades**
   - Selecciona el tipo de actividad
   - Ingresa el número de cart/HU
   - Especifica la cantidad
   - Presiona "▶ Iniciar"

3. **Finalización**
   - Cuando termines, presiona "■ Finalizar"
   - Confirma si fue exitoso o no
   - Agrega comentarios si es necesario

### 👨‍💼 Para Administradores

1. **Gestión de Usuarios**
   - Agrega nuevos usuarios con nombre, username y turno
   - Busca y filtra usuarios existentes
   - Elimina usuarios cuando sea necesario

2. **Monitoreo en Tiempo Real**
   - Visualiza métricas UPH por usuario y hora
   - Aplica filtros por fecha, turno y actividad
   - Exporta reportes a Excel

## 📊 Métricas Disponibles

- **UPH (Unidades Por Hora)**: Productividad por hora del día
- **Actividades por turno**: Desglose por turnos A, B, C, D
- **Tiempo promedio**: Duración promedio de actividades
- **Tasa de éxito**: Porcentaje de actividades completadas exitosamente

## 🔧 Personalización

### Agregar Nuevas Actividades
Edita `index.html` en la sección de selección de actividades:

```html
<option value="nueva_actividad">Nueva Actividad</option>
```

### Modificar Tema de Colores
Edita las variables CSS en `css/style.css` o `css/admin.css`:

```css
:root {
  --primary: #your-color;
  --secondary: #your-color;
  --surface: #your-color;
}
```

### Configurar Horarios de Turnos
Los turnos están configurados de 6:00 AM a 5:00 AM del día siguiente. Para modificar, edita la lógica en `js/admin.js` función `renderUPH()`.

## 🐛 Solución de Problemas

### Error: "Failed to get document because the client is offline"
- Verifica que las reglas de Firestore estén publicadas
- Confirma que las credenciales de Firebase sean correctas
- Revisa la conexión a internet

### Error: "initializeApp is not defined"
- Asegúrate de que los scripts de Firebase estén cargados correctamente
- Verifica que uses la versión compat de Firebase SDK

### Datos no se actualizan en tiempo real
- Confirma que el listener de Firestore esté activo
- Revisa la consola del navegador por errores
- Verifica que los datos se estén guardando correctamente

## 📈 Próximas Funcionalidades

- [ ] Notificaciones push para recordatorios
- [ ] Gráficos interactivos de productividad
- [ ] Exportación avanzada con filtros
- [ ] Modo offline con sincronización
- [ ] API REST para integraciones externas
- [ ] Autenticación con Firebase Auth

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Si encuentras problemas o tienes preguntas:

1. Revisa la sección de "Solución de Problemas"
2. Verifica que todas las dependencias estén instaladas
3. Abre un issue en el repositorio con detalles del error

---

**Desarrollado para optimizar operaciones VAS**</content>
<parameter name="filePath">c:\Users\Dominguezmh\OneDrive - Luxottica Group S.p.A\Desktop\VAS Tracker Portal\README.md