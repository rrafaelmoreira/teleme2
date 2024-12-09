<template>
  <div class="medico-apresentacao bg-light rounded-4">

      <div class="row">
        <!-- Card Principal: Informações do Médico -->
        <div class="col-md-12">
          <div class="card shadow-sm border-0 mx-auto h-100">
            <div class="card-body">
              <!-- Foto e Informações -->
              <div class="row align-items-center mb-4">
                <div class="col-md-3 text-center">
                  <img src="@/assets/medico_perfil.jpg" alt="Foto do Médico" class="rounded-circle border" width="100" height="120" />
                </div>
                <div class="col-md-10">
                  <h3 class="fw-bold text-start">Dr. {{ medicoInfo.fullName }}</h3>
                  <p class="text-muted mb-0 text-start">Especialidade: {{ medicoInfo.specialty }}</p>
                  <p class="text-muted mb-0 text-start">CRMV: {{ medicoInfo.crmv }}</p>
                  <p class="text-muted mb-0 text-start">{{ medicoInfo.email }}</p>
                </div>
              </div>
              <hr />

              <!-- Biografia -->
              <div>
                <h5 class="fw-bold text-start">Biografia</h5>
                <p class="text-start">{{ medicoInfo.bio }}</p>
              </div>
              <hr />

              <!-- Qualificações -->
              <div>
                <h5 class="fw-bold text-start">Qualificações</h5>
                <ul class="list-unstyled">
                  <li v-for="(qualificacao, index) in medicoInfo.qualifications" :key="index" class="text-start">
                    <i class="bi bi-circle-fill text-primary me-2"></i>{{ qualificacao }}
                  </li>
                </ul>
              </div>
              <hr />

              <!-- Contato -->
              <div>
                <h5 class="fw-bold text-start">Contato</h5>
                <p class="text-start"><i class="bi bi-clock-fill text-primary me-2"></i>Horário de atendimento: {{ medicoInfo.contact.workingHours }}</p>
                <p class="text-start"><i class="bi bi-geo-fill text-primary me-2"></i>{{ medicoInfo.contact.officeAddress }}</p>
                <p class="text-start"><i class="bi bi-telephone-fill text-primary me-2"></i>{{ medicoInfo.contact.tel }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

</template>

<script>
import { ref, onMounted } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export default {
  props: ['medicoId'],
  setup(props) {
    const medicoInfo = ref({
      fullName: '',
      socialName: '',
      specialty: '',
      crmv: '',
      cpf: '',
      bio: '',
      qualifications: [],
      email: '',
      contact: {
        workingHours: '',
        officeAddress: '',
        tel: ''
      }
    });

    onMounted(async () => {
      const docRef = doc(db, 'users', props.medicoId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        medicoInfo.value = docSnap.data();
      }
    });

    return {
      medicoInfo
    };
  }
};
</script>

<style scoped>

.medico-apresentacao {
  background-color: #f8f9fa;
  max-width: 600px; /* Ajuste este valor conforme necessário */
  width: 100%; /* Garante que o contêiner use o máximo de espaço até seu máximo definido */
  margin-left: 0;
  margin: 0 auto; /* Centraliza o contêiner na página */
  border-radius: 15px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}


.card {
  border-radius: 15px;
  border: 0; /* Garante que não haja borda */
  max-height: 100%; /* Utiliza toda a altura possível, ideal para responsividade */
  margin-top: -5px; /* Ajusta essa margem negativa para mover o card para cima */


}

img {
  object-fit: cover;
  border: 3px solid #eaeaea;
}
</style>
