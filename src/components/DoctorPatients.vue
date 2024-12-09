<template>
  <div class="patient-details-container">
    <h1>Pacientes com Consultas Agendadas</h1>
    <div v-if="Object.keys(groupedPatients).length">
      <div v-for="(group, clientId) in groupedPatients" :key="clientId" class="client-group">
        <h2 @click="toggleExpand(clientId)" class="client-group-header">
          Tutor: {{ group.data.fullName }} ({{ group.animals.length }} animais)
        </h2>
        <div v-if="group.expanded" class="client-group-body">
          <p><strong>CPF:</strong> {{ group.data.cpf }}</p>
          <p><strong>Gênero:</strong> {{ group.data.gender }}</p>
          <p><strong>Telefone de Contato:</strong> {{ formatPhoneNumber(group.data.emergencyContact) || "Não informado" }}</p>

                  <h3>Animais</h3>
          <ul>
            <li v-for="pet in group.animals" :key="pet.id">
              <p><strong>Nome do Pet:</strong> {{ pet.name }}</p>
              <p><strong>Espécie:</strong> {{ pet.species }}</p>
              <p><strong>Raça:</strong> {{ pet.breed || "Não disponível" }}</p>
              <p><strong>Condições:</strong> {{ pet.conditions || "Não especificado" }}</p>
              <p><strong>Peso:</strong> {{ pet.weight || "Não especificado" }} kg</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div v-else>
      <p>Nenhum paciente com consulta agendada no momento.</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { db } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default {
  name: "DoctorPatients",
  setup() {
    const groupedPatients = ref({});
    const auth = getAuth();
    const currentMedicoId = ref(auth.currentUser ? auth.currentUser.uid : null);

    // Função para buscar e agrupar pacientes e animais com base nos eventos de consulta do médico logado
    async function fetchPatientsData() {
      if (currentMedicoId.value) {
        const eventsRef = collection(db, `users/${currentMedicoId.value}/events`);
        const eventsQuery = query(eventsRef, where("available", "==", false));

        onSnapshot(eventsQuery, async (snapshot) => {
          const clients = {}; // Objeto para agrupar os dados dos clientes

          for (const eventDoc of snapshot.docs) {
            const eventData = eventDoc.data();
            if (eventData.service && eventData.clientId) {
              // Verifica se o cliente já está no objeto 'clients' para evitar duplicação de buscas
              if (!clients[eventData.clientId]) {
                const clientData = await fetchClientData(eventData.clientId);
                const animals = await fetchPetsData(eventData.clientId);

                if (clientData) {
                  clients[eventData.clientId] = {
                    clientId: eventData.clientId,
                    data: clientData,
                    animals: animals,
                    expanded: false,
                  };
                }
              }
            }
          }

          groupedPatients.value = clients; // Atualiza os dados agrupados
        });
      } else {
        console.error("Médico não autenticado.");
      }
    }

    // Função para buscar os dados do cliente usando clientId
    async function fetchClientData(clientId) {
      try {
        const clientRef = doc(db, 'users', clientId);
        const clientSnap = await getDoc(clientRef);

        if (clientSnap.exists()) {
          return clientSnap.data();
        } else {
          console.error("Paciente não encontrado.");
          return null;
        }
      } catch (error) {
        console.error("Erro ao buscar dados do paciente:", error);
        return null;
      }
    }

    // Função para buscar os dados dos animais do paciente usando clientId como ownerId
    async function fetchPetsData(ownerId) {
      try {
        const petsRef = collection(db, 'pets');
        const petsQuery = query(petsRef, where('ownerId', '==', ownerId));
        const petsSnapshot = await getDocs(petsQuery);

        return petsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Erro ao buscar dados dos animais:", error);
        return [];
      }
    }

    // Função para expandir e colapsar o grupo de clientes
    function toggleExpand(clientId) {
      if (groupedPatients.value[clientId]) {
        groupedPatients.value[clientId].expanded = !groupedPatients.value[clientId].expanded;
      }
    }
     // Função para formatar o telefone
     const formatPhoneNumber = (phoneNumber) => {
      const cleaned = ('' + phoneNumber).replace(/\D/g, '');
      const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
      if (match) {
        return '(' + match[1] + ') ' + match[2] + '-' + match[3];
      }
      return null;
    };

    onMounted(fetchPatientsData);

    return { groupedPatients, toggleExpand,formatPhoneNumber  };
  },
};
</script>

<style scoped>
.patient-details-container {
  max-width: 800px;
  margin: auto;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.client-group {
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 10px 0;
  overflow: hidden;
}

.client-group-header {
  padding: 10px;
  font-size: 18px; /* Tamanho maior para destaque */
  font-weight: bold;
  color: #5A8A6C; /* Cor de destaque */
  text-decoration: none; /* Remove sublinhado padrão */
  cursor: pointer;
  background-color: hsl(210, 17%, 98%);
  border: none;
  display: block; /* Garante que ocupe a linha inteira */
  margin-bottom: 5px; /* Espaço antes do corpo do grupo */
}

.client-group-header:hover {
  text-decoration: underline; /* Sublinhado ao passar o mouse */
}

.client-group-body {
  padding: 20px;
  background-color: hsl(210, 17%, 98%);

  box-shadow: 0 2px 5px hsl(83, 66%, 77%);
  border-radius: 8px;
  margin-top: 10px;
}

.client-group-body p, .client-group-body h3 {
  color: #093a03;
  line-height: 1.6; /* Melhora o espaçamento entre linhas */
}

.client-group-body p {
  font-size: 14px; /* Tamanho ideal para leitura confortável */
  margin-bottom: 10px; /* Espaçamento consistente */
}

.client-group-body h3 {
  font-size: 16px;
  font-weight: 600; /* Mais destaque para subtítulos */
  margin-bottom: 15px; /* Espaçamento antes da lista */
}

ul {
  list-style-type: none;
  padding: 0;
}

ul li {
  background: #F8F9FA;
  border: 1px solid #649377;
  margin-bottom: 8px;
  padding: 12px;
  border-radius: 6px; /* Bordas arredondadas */
  box-shadow: 0 1px 3px hsla(101, 30%, 18%, 0.753); /* Sombra suave para os itens da lista */
  transition: transform 0.2s ease-in-out; /* Suaviza a transição da transformação */
}

ul li:hover {
  transform: scale(1.05); /* Aumenta o tamanho do item de lista em 5% quando o mouse passa sobre ele */
}

.client-group-header:hover {
  transform: scale(1.1); /* Aumenta o tamanho do título ao passar o mouse */
  text-decoration: underline; /* Mantém o sublinhado ao passar o mouse para indicar interatividade */
}
</style>

