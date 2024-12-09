<template>
  <div class="medicos-container">
    <h1>Médicos Disponíveis</h1>
    <ul class="medicos-list">
      <li v-for="medico in medicos" :key="medico.id" class="medico-item">
        <div class="medico-info">
          <h2>{{ medico.gender === 'feminino' ? 'Dra.' : 'Dr.' }} {{ medico.fullName }}</h2>
          <p><i class="fas fa-stethoscope"></i> <strong>Especialidade:</strong>   {{ medico.specialty }}</p>
          <p><i class="fas fa-id-badge"></i> <strong>CRMV:</strong> {{ medico.crmv }}</p>
          <button @click="agendar(medico)">Agendar Consulta</button>
        </div>  
      </li>
    </ul>
  </div>
</template>



<script>


import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router'; 
import { db } from '@/firebase'; // Ajuste o caminho conforme seu arquivo de configuração
import { collection, query, where, getDocs } from 'firebase/firestore'; 

export default {
  name: 'ListaMedicos',
  setup() {
    const medicos = ref([]);
    const router = useRouter();

    // Função para buscar todos os médicos
    const fetchMedicos = async () => {
      try {
        // Referência para a coleção 'users'
        const medicosRef = collection(db, 'users');
        // Consulta para buscar usuários com tipo 'medico'
        const q = query(medicosRef, where('userType', '==', 'medico'));
        const querySnapshot = await getDocs(q);
        
        // Mapeando os dados para uma estrutura mais fácil de usar
        medicos.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log(medicos.value); // Verifique no console se os dados estão sendo carregados corretamente
      } catch (error) {
        console.error("Erro ao buscar médicos:", error);
      }
    };

    // Função para agendar consulta
    const agendar = (medico) => {
      console.log("Redirecionando para agenda do médico com ID:", medico.id);

      if (confirm(`Deseja agendar uma consulta com ${medico.fullName}?`)) {
        router.push({ name: 'verAgenda', params: { medicoId: medico.id } });
      }
    };

    // Chama a função para buscar médicos ao montar o componente
    onMounted(fetchMedicos);

    return { medicos, agendar };
  }
};
</script>




<style scoped>
.medicos-container {
  max-width: 800px;
  margin: 320px auto 20px; /* Aumentei a margem superior para 70px */
  background-color:#FFFFFF;   
  padding: 20px;
  border-radius: 10px;
}

.medicos-list {
  list-style: none;
  padding: 0;
}

.medico-item {
  display: flex;
  align-items: center;
  justify-content: center; /* Centraliza horizontalmente */ 
  background-color: #F6F7F8 ;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  padding: 20px;
  transition: box-shadow 0.3s;
}

.medico-item:hover {
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}
.medico-info{
  background-color: #F6F7F8
}

.medico-info h2 {
  margin: 0;
  font-size: 18px;
  color: #000000;
  flex-grow: 1;
}

button {
  padding: 10px 10px;
  background: linear-gradient(to right, #91e4b9, #30c277);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  align-items: center;
}

button i {
  margin-right: 5px;
}

body {
  padding-top: 500px; /* Ajuste conforme a altura do seu cabeçalho */
}
</style>