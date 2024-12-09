import { createRouter, createWebHistory } from 'vue-router';
import { getAuth } from 'firebase/auth';

import LoginPage from '@/components/LoginPage.vue';
import RegisterPage from '@/components/RegisterPage.vue';
import HomepageComponent from '@/components/HomepageComponent.vue';
import DoctorProfile from '@/components/DoctorProfile.vue';
import DoctorList from '@/components/DoctorList.vue';
import DoctorPatients from '../components/DoctorPatients.vue';
import DoctorConsultations from '../components/DoctorConsultations.vue';
import DoctorSettings from '../components/DoctorSettings.vue';
import DoctorMeet from '@/components/DoctorMeet.vue';
import PetOwnerProfile from '@/components/PetOwnerProfile.vue';
import DoctorSchedule from '@/components/DoctorSchedule.vue';
import Petprofile from '@/components/Petprofile.vue';


const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: LoginPage, meta: { hideHeader: true } },
  { path: '/register', name: 'Register', component: RegisterPage, meta: { hideHeader: true, requiresGuest: true } },
  { path: '/home', name: 'Home', component: HomepageComponent },
  { path: '/perfil-medico', name: 'DrProfile', component: DoctorProfile },
  { path: '/lista-medicos', name: 'DrList', component: DoctorList },
  { path: '/pacientes', name: 'DrPatients', component: DoctorPatients },
  { path: '/consultations', name: 'DrConsultations', component: DoctorConsultations },
  { path: '/settings', name: 'DrSettings', component: DoctorSettings },
  { path: '/criar-reuniao', name: 'DrMeet', component: DoctorMeet },
  {path: '/medico-agenda/:medicoId', name: 'verAgenda', component: DoctorSchedule,props: true  },
  { path: '/perfil-cliente', name: 'PtProfile', component: PetOwnerProfile },
  { path: '/pets', name: 'pets', component: Petprofile },

];

// Criando a constante auth para verificar se o usuário está logado ou não  
const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

// Guarda de navegação global para proteger as rotas
router.beforeEach(async (to, from, next) => {
  const auth = getAuth();
  await auth.currentUser; // Garantir que a autenticação esteja resolvida
  const user = auth.currentUser;

  if (to.matched.some(record => record.meta.requiresAuth) && !user) {
    // Se a rota requer autenticação e o usuário não está logado
    next("/login");
  } else if (to.matched.some(record => record.meta.requiresGuest) && user) {
    // Se a rota requer que o usuário seja um convidado (não logado) e o usuário está logado
    next("/home"); // Redireciona para a página principal
  } else if (to.path === '/register' && user) {
    // Usuários autenticados tentando acessar a página de registro são redirecionados para home
    next("/home");
  } else {
    // Caso contrário, permite a navegação normal
    next();
  }
});



export default router;
