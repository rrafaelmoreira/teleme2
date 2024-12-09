<template>
  <div class="schedule-and-profile-container">
    <!-- Perfil do Médico à esquerda -->
    <div class="profile-container">
      <DoctorInfo :medicoId="medicoId" />
    </div>
    <!-- Agenda à direita -->
    <div class="agenda-container">
      <h1>Agenda do Médico</h1>
      <FullCalendar :options="calendarOptions" />

      <!-- Modal para Seleção do Tipo de Consulta -->
      <div class="modal fade" id="consultaModal" tabindex="-1" aria-labelledby="consultaModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="consultaModalLabel">Selecionar Tipo de Consulta</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <select id="consultaSelect" class="form-select">
                <option value="1">Teleconsulta Veterinária</option>
                <option value="2">Teletriagem</option>
                <option value="3">Teleinterconsulta (ou Teleconsultoria)</option>
                <option value="4">Educação e Orientação Remota</option>
              </select>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="confirmConsulta">Confirmar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para Seleção de Pet -->
      <div class="modal fade" id="petSelectionModal" tabindex="-1" aria-labelledby="petSelectionModalLabel"
        aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="petSelectionModalLabel">Selecionar Animal de Estimação</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <select id="petSelect" class="form-select">
                <!-- As opções serão preenchidas dinamicamente -->
              </select>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="confirmPetSelection">Confirmar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Genérico para Mensagens -->
      <div class="modal fade" id="genericModal" tabindex="-1" aria-labelledby="genericModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="genericModalLabel">Atenção</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p id="modalMessage"></p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
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
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { db } from '@/firebase';
import { collection, getDocs, addDoc,doc,deleteDoc, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import DoctorInfo from './DoctorInfo';
import { Modal } from 'bootstrap';

export default {
  props: ['medicoId'],
  components: {
    FullCalendar,
    DoctorInfo,
  },
  setup(props) {
    const calendarOptions = ref({
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay',
      },
      locale: ptBrLocale,
      slotEventOverlap: true, // Deve ser true para permitir a sobreposição visual dos eventos
      eventOverlap: true, 
      selectable: true,
      editable: true,
      slotDuration: '01:00:00',
      slotLabelInterval: '01:00:00',
      allDaySlot: true,
      select: handleDateSelect,
      events: [],
    });

    const disponibilidade = ref([]);
    const consultas = ref([]);
    const currentEvents = ref([]);
    const auth = getAuth();
    const clientId = ref(auth.currentUser ? auth.currentUser.uid : null);

    onMounted(() => {
      fetchEvents();
    });

    async function fetchEvents() {
      const eventsRef = collection(db, `users/${props.medicoId}/events`);
      const querySnapshot = await getDocs(eventsRef);
      querySnapshot.forEach(doc => {
        const eventData = doc.data();
        eventData.id = doc.id;
        eventData.available ? disponibilidade.value.push(eventData) : consultas.value.push(eventData);
        currentEvents.value.push(eventData);
      });
      calendarOptions.value.events = currentEvents.value;
    }

    async function handleDateSelect(selectInfo) {
  const start = selectInfo.startStr;
  const end = selectInfo.endStr;

  // Verifica se há sobreposição com eventos de consulta existentes
  if (consultas.value.some(event => event.start < end && event.end > start)) {
    showModal("Este horário já está ocupado por uma consulta.");
    selectInfo.view.calendar.unselect();
    return;
  }

  // Encontra disponibilidades que se sobrepõem ao horário selecionado
  const overlappingAvailabilities = disponibilidade.value.filter(event => event.start < end && event.end > start);
  if (overlappingAvailabilities.length === 0) {
    showModal("Somente horários marcados como 'Disponível' podem ser agendados.");
    selectInfo.view.calendar.unselect();
    return;
  }

  // Processa a seleção de tipo de consulta
  showConsultaModal(async (selectedOption) => {
    const title = getServiceType(selectedOption);
    if (!title) {
      showModal('Opção inválida. Selecione novamente.');
      return;
    }

    // Continua com o processo de agendamento, incluindo a seleção de pets
    const pets = await fetchClientPets();
    if (pets.length === 0) {
      showModal('Nenhum animal encontrado para este cliente.');
      selectInfo.view.calendar.unselect();
      return;
    }

    showPetSelectionModal(pets, async (selectedPet) => {
      // Remove as disponibilidades originais e cria novos blocos de disponibilidade
      await Promise.all(overlappingAvailabilities.map(availability => adjustAvailability(availability, start, end)));

      // Cria o novo evento de consulta
      const newEvent = {
        title: `${title} - ${selectedPet.name} (${selectedPet.species})`,
        start: start,
        end: end,
        color: '#ff9f89',
        available: false,
        clientId: clientId.value,
        petId: selectedPet.id,
      };
      await addEvent(newEvent);
      currentEvents.value.push(newEvent);
      calendarOptions.value.events = [...currentEvents.value];
      selectInfo.view.calendar.unselect();
    });
  });
}

function adjustAvailability(availability, start, end) {
  // Deleta a disponibilidade que será sobrescrita pelo novo evento
  return deleteDoc(doc(db, `users/${props.medicoId}/events`, availability.id)).then(() => {
    // Cria novas disponibilidades antes e depois do evento agendado, se necessário
    const tasks = [];
    if (availability.start < start) {
      const newAvailabilityBefore = {
        title: 'Disponível',
        start: availability.start,
        end: start,
        color: '#99cc99',
        available: true,
      };
      tasks.push(addDoc(collection(db, `users/${props.medicoId}/events`), newAvailabilityBefore));
    }
    if (end < availability.end) {
      const newAvailabilityAfter = {
        title: 'Disponível',
        start: end,
        end: availability.end,
        color: '#99cc99',
        available: true,
      };
      tasks.push(addDoc(collection(db, `users/${props.medicoId}/events`), newAvailabilityAfter));
    }
    return Promise.all(tasks);
  });
}

function getServiceType(option) {
  return {
    '1': 'Teleconsulta Veterinária',
    '2': 'Teletriagem',
    '3': 'Teleinterconsulta',
    '4': 'Educação e Orientação Remota'
  }[option];
}
    async function addEvent(event) {
      await addDoc(collection(db, `users/${props.medicoId}/events`), event);
    }

    function showModal(message) {
      const modalElement = document.getElementById('genericModal');
      const modalInstance = new Modal(modalElement);
      document.getElementById('modalMessage').textContent = message;
      modalInstance.show();
    }

    function showConsultaModal(callback) {
      const modalElement = document.getElementById('consultaModal');
      const modalInstance = new Modal(modalElement);
      document.getElementById('confirmConsulta').onclick = () => {
        const selectedOption = document.getElementById('consultaSelect').value;
        callback(selectedOption);
        modalInstance.hide();
      };
      modalInstance.show();
    }

    function showPetSelectionModal(pets, callback) {
      // Preencher o select com os pets
      const petSelect = document.getElementById('petSelect');
      petSelect.innerHTML = '';  // Limpa as opções existentes
      pets.forEach(pet => {
        const option = document.createElement('option');
        option.value = pet.id;
        option.textContent = `${pet.name} (${pet.species})`;
        petSelect.appendChild(option);
      });
      const modalElement = document.getElementById('petSelectionModal');
      const modalInstance = new Modal(modalElement, {
        backdrop: 'static'  // Desabilita fechar ao clicar fora
      });
      document.getElementById('confirmPetSelection').onclick = () => {
        const selectedPetId = petSelect.value;
        const selectedPet = pets.find(pet => pet.id === selectedPetId);
        callback(selectedPet);  // Chama o callback com o pet selecionado
        modalInstance.hide();  // Fecha o modal
      };
      // Mostra o modal
      modalInstance.show();
    }
    async function fetchClientPets() {
      const petsRef = collection(db, 'pets');
      const petsQuery = query(petsRef, where('ownerId', '==', clientId.value));
      const petsSnapshot = await getDocs(petsQuery);
      return petsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    return {
      calendarOptions,
    };
  },
};
</script>


<style scoped>
.schedule-and-profile-container {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  /* Assegura que ambos os contêineres ocupem toda a altura disponível */
  flex-wrap: nowrap;
  
}
.profile-container {
  flex: 2;
  /* Aumenta a proporção de flex para tornar o perfil mais largo */
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 10px;
  margin-right: 0;
}


.agenda-container {
  flex: 3;
  /* Reduz a proporção de flex para balancear com o aumento do perfil */
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: px;
}

.fc {
  width: 100%;
  /* Assegura que o FullCalendar preencha todo o espaço horizontal do seu contêiner */
  max-height: 100%;
  /* Limita a altura do FullCalendar para não ultrapassar o contêiner */
  overflow: hidden;
  /* Esconde qualquer conteúdo que ultrapasse o limite de altura */
}

.fc .fc-timegrid-event, .fc .fc-timegrid-event:hover {
  width: 100% !important; /* Força os eventos a ocuparem toda a largura do slot */
  max-width: none !important;
}
.fc-event-main {
    padding: 4px 10px;  
}
.fc {
  max-width: 100%;
  margin: 0 auto;
}

</style>
