<template>
  <div id="app">
    <!-- Exibe o HeaderComponent em todas as páginas, exceto na página de login -->
    <HeaderComponent v-if="showHeader" />
    
    <router-view />
  </div>
</template>
<script>
import { onMounted, ref,computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { auth } from "./firebase"; // Certifique-se de que está corretamente configurado
import HeaderComponent from "@/components/HeaderComponent.vue"; // Importa o seu cabeçalho


export default {
  name: "App",
  components: {
    HeaderComponent,

  },

  setup() {
    const router = useRouter();
    const route = useRoute();
    const isAuthenticated = ref(false); // Estado para verificar autenticação

    onMounted(() => {
      auth.onAuthStateChanged((user) => {
        if (user) {
          isAuthenticated.value = true; // Usuário autenticado
          console.log("Usuário autenticado:", user);
          router.push("/home"); // Redireciona para a página inicial
        } else {
          isAuthenticated.value = false; // Usuário não autenticado
          if (route.path !== "/login") {
            console.log("Nenhum usuário autenticado, redirecionando para login...");
            router.push("/login"); // Redireciona para login
          }
        }
      });
    });

    const showHeader = computed(() => {
      // Retorna 'false' se a rota atual é login ou registro, caso contrário 'true'
      return !['/login', '/register', '/forgot-password'].includes(route.path);
    });

    return { isAuthenticated,showHeader };
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
