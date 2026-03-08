<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository for Sportivo Backend.

## 🚀 Documentación (Swagger)

La documentación interactiva de la API está disponible en:
👉 **`http://localhost:3000/api/docs`**

Puedes usar el botón **Authorize** para ingresar tu JWT Token o Internal API Key y probar los endpoints protegidos directamente.

## Instalación del Proyecto

```bash
$ npm install
```

## Ejecución

```bash
# desarrollo
$ npm run start

# modo watch
$ npm run start:dev

# modo producción
$ npm run start:prod
```

## 🐳 Despliegue con Docker

El proyecto está completamente contenedorizado. Para levantar todo el entorno (Backend + Base de Datos):

```bash
# Levantar todos los servicios
docker-compose up --build

# Ejecutar migraciones de Prisma dentro del contenedor (si es necesario)
docker-compose exec sportivo-back npx prisma db push
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## 🏗️ Arquitectura de Datos

El sistema sigue una arquitectura **Multi-tenant** donde casi todas las entidades están vinculadas a una `School`. A continuación se detallan las relaciones principales:

### 📊 Diagrama de Entidad-Relación

```mermaid
erDiagram
    School ||--o{ User : "tiene"
    School ||--o{ Plan : "ofrece"
    School ||--o{ Facility : "posee"
    School ||--o{ "Class" : "organiza"
    
    User ||--o{ StudentProfile : "perfil de"
    User ||--o{ TutorProfile : "perfil de"
    User ||--o{ CoachProfile : "perfil de"
    
    User ||--o{ UserTutor : "tutor/estudiante"
    UserTutor }o--|| User : "vincula"
    
    Subscription ||--|| User : "estudiante (beneficiario)"
    Subscription ||--|| User : "pagador (tutor)"
    Subscription ||--|| Plan : "basado en"
    
    "Class" }o--|| Sport : "de"
    "Class" }o--|| Facility : "en"
    "Class" }o--|| User : "coach"
    
    ClassEnrollment }o--|| "Class" : "clase"
    ClassEnrollment }o--|| User : "alumno"
    
    AttendanceSession ||--o{ AttendanceRecord : "contiene"
    AttendanceSession ||--|| "Class" : "de la clase"
```

### 🔑 Entidades Clave

1.  **School**: El eje central. Separa los datos de cada cliente/institución.
2.  **User & Profiles**: Un usuario tiene un `Role`. Dependiendo del rol, puede tener perfiles específicos (`StudentProfile`, `TutorProfile`, `CoachProfile`) con datos adicionales.
3.  **Relación Tutor-Estudiante**: Manejada mediante `UserTutor` para permitir que un tutor gestione múltiples alumnos y viceversa.
4.  **Suscripciones y Pagos**:
    *   `Subscription` vincula a un beneficiario con un plan.
    *   `PayerId` permite que un tercero (tutor) pague la cuenta.
5.  **Módulo Deportivo**:
    *   `Sport`: Define campos personalizados por defecto.
    *   `SchoolSport`: Permite a cada escuela sobrescribir la ficha deportiva.
    *   `Class`: Grupos de entrenamiento con horarios y cupos.
    *   `Attendance`: Control de asistencia por sesión.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
