/* eslint-disable */
<template>
  <div class="agenda-container">
    <h1>Definir Disponibilidade</h1>
    <FullCalendar :options="calendarOptions" />

    <!-- Modal para confirmação de ações -->
    <div class="modal fade" id="actionModal" tabindex="-1" aria-labelledby="actionModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="actionModalLabel">{{ modalTitle }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            {{ modalBody }}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="modalAction">Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br'; // Importa o locale pt-br

import { db } from '@/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import bootstrap from "bootstrap/dist/js/bootstrap.bundle";

export default {
  components: {
    FullCalendar,
  },
  setup() {
    const calendarOptions = ref({
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'timeGridWeek',
      locale: ptBrLocale, // Define o locale para português do Brasil

      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay',
      },
      selectable: true,
      editable: true,
      eventClick: handleEventClick,
      select: handleDateSelect,
      events: [],
      slotDuration: '01:00:00',
      slotLabelInterval: '01:00:00',
      expandRows: true,
    });
    
    const currentEvents = ref([]);
    const medicoId = ref(getAuth().currentUser ? getAuth().currentUser.uid : null);
    const modalTitle = ref("");
    const modalBody = ref("");
    const modalAction = ref(() => {}); // Usando ref para a ação do modal

    if (!medicoId.value) {
      console.error("Usuário não autenticado");
      return;
    }


       // Função para abrir o modal
      function openModal(title, body, action) {
      modalTitle.value = title;
      modalBody.value = body;
      modalAction.value = action;
      const modal = new bootstrap.Modal(document.getElementById('actionModal'));
      modal.show();
    }

    function closeModal() {
  const modalEl = document.getElementById('actionModal');
  const modalInstance = bootstrap.Modal.getInstance(modalEl);
  if (modalInstance) {
    modalInstance.hide();
  }
  }

    // Função para definir a disponibilidade
   // Função para definir a disponibilidade
async function handleDateSelect(selectInfo) {
  // Convertendo as strings de data e hora para objetos Date
  const startDate = new Date(selectInfo.startStr);
  const endDate = new Date(selectInfo.endStr);

  // Formata as datas para o formato desejado
  const formattedStartDate = startDate.toLocaleDateString('pt-BR');
  const formattedStartTime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formattedEndTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Define o corpo da mensagem e a ação do modal para confirmar a disponibilidade
  const modalBodyMessage = `Deseja definir este horário como disponível: ${formattedStartDate} às ${formattedStartTime} até ${formattedEndTime}?`;
  const actionFunction = async () => {
    const newAvailability = {
      title: 'Disponível',
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      color: '#99cc99',
      available: true,
    };

    // Adiciona o novo evento de disponibilidade ao Firestore
    const eventsRef = collection(db, `users/${medicoId.value}/events`);
    const eventDoc = await addDoc(eventsRef, newAvailability);

    // Adiciona o id do documento Firestore ao evento e atualiza o calendário
    newAvailability.id = eventDoc.id;
    currentEvents.value.push(newAvailability);
    calendarOptions.value.events = [...currentEvents.value];

    selectInfo.view.calendar.unselect(); // Deseleciona a seleção atual no calendário
    closeModal(); // Fecha o modal após a ação ser concluída
  };

  // Abre o modal com a mensagem e a função de ação
  openModal("Definir Disponibilidade", modalBodyMessage, actionFunction);
}


// Função para exibir informações detalhadas do evento e oferecer opção de deletar
async function handleEventClick(clickInfo) {
  const eventId = clickInfo.event.id;
  const event = currentEvents.value.find(e => e.id === eventId);

  if (!event) {
    alert("Evento não encontrado.");
    return;
  }

  // Convertendo as strings de data e hora para objetos Date
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  // Formata as datas para o formato desejado
  const formattedStartDate = startDate.toLocaleDateString('pt-BR');
  const formattedStartTime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formattedEndTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let details = `Deseja remover esse horário ${formattedStartDate} às ${formattedStartTime} até ${formattedEndTime}  da sua agenda? `;

  // Configura a mensagem e ação do modal para excluir
  openModal("Confirmar Exclusão", details, async () => {
    await deleteEvent(eventId);
    closeModal();
  });
}

// Função para excluir um evento do Firestore e do calendário
async function deleteEvent(eventId) {
  const eventRef = doc(db, `users/${medicoId.value}/events`, eventId);
  try {
    await deleteDoc(eventRef);
    currentEvents.value = currentEvents.value.filter(event => event.id !== eventId);
    calendarOptions.value.events = [...currentEvents.value];
  } catch (error) {
    console.error("Erro ao excluir o evento:", error);
  }
}

    // Função para buscar a disponibilidade e consultas do Firestore
    async function fetchAvailability() {
      currentEvents.value = [];

      const eventsRef = collection(db, `users/${medicoId.value}/events`);
      const querySnapshot = await getDocs(eventsRef);
      for (const docSnapshot of querySnapshot.docs) {
        const eventData = docSnapshot.data();
        eventData.id = docSnapshot.id;

        if (!eventData.available && eventData.clientId) {
          const clientData = await fetchClientData(eventData.clientId);
          const petData = await fetchPetData(eventData.clientId, eventData.petId);
          if (clientData && petData) {
            eventData.title = `Cliente: ${clientData.firstName} ${clientData.lastName} | Animal: ${petData.name} | Serviço: ${eventData.service || eventData.title}`;
            eventData.color = '#ff9f89';
          }
        }

        currentEvents.value.push(eventData);
      }

      calendarOptions.value.events = [...currentEvents.value];
    }

    // Função para buscar os dados do cliente no Firestore usando o ID do cliente
    async function fetchClientData(clientId) {
      try {
        const clientRef = doc(db, 'users', clientId);
        const clientSnapshot = await getDoc(clientRef);
        if (clientSnapshot.exists()) {
          const clientData = clientSnapshot.data();
          return {
            firstName: clientData.firstName,
            lastName: clientData.lastName,
          };
        } else {
          console.error(`Cliente com ID ${clientId} não encontrado`);
        }
      } catch (error) {
        console.error("Erro ao buscar os dados do cliente:", error);
      }
      return null;
    }

    // Função para buscar os dados do animal na coleção 'pets' usando o ownerId e petId
    async function fetchPetData(ownerId, petId) {
      try {
        const petRef = doc(db, 'pets', petId);
        const petSnapshot = await getDoc(petRef);

        if (petSnapshot.exists() && petSnapshot.data().ownerId === ownerId) {
          return petSnapshot.data();
        } else {
          console.error(`Animal com ownerId ${ownerId} e petId ${petId} não encontrado`);
        }
      } catch (error) {
        console.error("Erro ao buscar os dados do animal:", error);
      }
      return null;
    }

    onMounted(fetchAvailability);

    return { calendarOptions,modalTitle,
      modalBody,
      openModal,
      closeModal,
      modalAction, };
  },
};
</script>




<style scoped>
.agenda-container {
  max-width: 800px;
  margin: auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.fc .fc-event-title {
  white-space: normal;
}

.fc .fc-event {
  font-size: 0.9em;
  padding: 5px;
  border-radius: 5px;
}
</style>
