  <template>
    <div class="profile-page d-flex justify-content-center align-items-center">
      <div class="profile-container">
        <h2 class="modal-title profile-header">Meu Perfil</h2>

        <!-- Bloco de visualização do perfil -->
        <div v-if="!editMode" class="profile-view">
          <div class="row mb-2">
            <div class="col-md-6">
              <p class="text-start txt_profile"><strong>Nome:</strong></p>
              <p class="profile-info">{{ userProfile?.fullName }}</p>
            </div>
            <div class="col-md-6">
              <p class="text-start txt_profile"><strong>Gênero:</strong></p>
              <p class="profile-info">{{ userProfile?.gender }}</p>
            </div>
          </div>
          <div class="row mb-2">
            <div class="col-md-6">
              <p class="text-start txt_profile"><strong>CPF:</strong></p>
              <p class="profile-info">{{ userProfile?.cpf }}</p>
            </div>
            <div class="col-md-6">
              <p class="text-start txt_profile no-wrap"><strong>Telefone:</strong></p>
              <p class="profile-info">{{ formattedEmergencyContact }}</p>
            </div>
          </div>
          <button class="btn btn-gradient w-100" @click="toggleEditMode">Editar</button>
        </div>

        <!-- Bloco de edição do perfil -->
        <form v-else @submit.prevent="updateUserProfile" class="profile-edit">
          <div class="row mb-2">
            <div class="col-md-6">
              <p class="text-start txt_profile">Nome Completo:</p>
              <input id="fullName" v-model="userProfile.fullName" type="text" class="form-control profile-input" />
              <div v-if="errorMessages.fullName" class="error">Nome deve conter apenas letras e ser obrigatório.</div>
            </div>
            <div class="col-md-6">
              <p class="text-start txt_profile">Gênero:</p>
              <select id="gender" v-model="userProfile.gender" class="form-control profile-input">
                <option disabled value="">Selecione o gênero</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>
          <div class="row mb-2">
            <div class="col-md-6">
              <p class="text-start txt_profile">CPF:</p>
              <input id="cpf" v-model="userProfile.cpf" type="text" class="form-control profile-input" />
              <div v-if="errorMessages.cpf" class="error">CPF deve conter exatamente 11 números.</div>
            </div>
            <div class="col-md-6">
              <p class="text-start txt_profile no-wrap"><strong>Telefone:</strong></p>
              <input id="emergencyContact" v-model="userProfile.emergencyContact" type="text"
                class="form-control profile-input" />
            </div>
          </div>
          <div class="row">
          <div class="col-6">
            <button class="btn btn-save" type="submit" :disabled="!isFormValid"><i class="bi bi-check2-circle"></i> Salvar</button>
          </div>
          <div class="col-6">
            <button class="btn btn-cancel" @click="toggleEditMode"><i class="bi bi-x-circle"></i> Cancelar</button>
          </div>
        </div>
         <!-- Mensagem de sucesso -->
        <div v-if="saveSuccess" class="alert alert-success mt-2">Alterações salvas com sucesso!</div>   
        </form>
      </div>
    </div>
  </template>


  <script>
  import { ref, onMounted, reactive, computed, watch } from 'vue';
  import { getAuth } from 'firebase/auth';
  import { db } from '@/firebase';
  import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

  export default {
    name: 'PetOwnerProfile',

    setup() {
      const auth = getAuth();
      const showSection = ref('profile');
      const userProfile = reactive({
        uid: '',
        fullName: '',
        socialName: '',
        gender: '',
        cpf: '',
        emergencyContact: ''

      });
      const pets = ref([]);
      const editMode = ref(false);  // Controla o modo de edição do perfil
      const saveSuccess = ref(false);

      // Computed property para formatar o telefone de emergência

      const formattedEmergencyContact = computed(() => {
        if (!userProfile.emergencyContact) return 'Não informado';
        const cleaned = userProfile.emergencyContact.replace(/\D/g, ''); // Remove não numéricos
        const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/); // Aplica máscara
        return match ? `(${match[1]}) ${match[2]}-${match[3]}` : userProfile.emergencyContact;
      });

      const fetchUserData = async (uid) => {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          Object.assign(userProfile, userSnap.data());
        } else {
          console.error("No such document!");
        }
      };

      const fetchPets = async (uid) => {
        const petsCollection = collection(db, `users/${uid}/pets`);
        const petSnapshot = await getDocs(petsCollection);
        pets.value = petSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      };

      watch(showSection, async (newSection) => {
        if (newSection === 'pets') {
          await fetchPets(userProfile.uid);
        }
      });

      onMounted(async () => {
        if (auth.currentUser) {
          userProfile.uid = auth.currentUser.uid;
          await fetchUserData(userProfile.uid);
          await fetchPets(userProfile.uid);
        } else {
          console.error("Usuário não autenticado ou indisponível");
        }
      });

      const errorMessages = reactive({
       fullName: false,
        socialName: false,
        cpf: false
      });

      const toggleEditMode = () => {
        editMode.value = !editMode.value;
      };

      const validateForm = () => {
        errorMessages.fullName = !userProfile.fullName || !userProfile.fullName.match(/^[a-zA-ZáéíóúÁÉÍÓÚãõÃÕçÇ\s]*$/);
        errorMessages.socialName = userProfile.socialName && !userProfile.socialName.match(/^[a-zA-ZáéíóúÁÉÍÓÚãõÃÕçÇ\s]*$/);
        errorMessages.cpf = !userProfile.cpf.match(/^\d{11}$/);

        return !Object.values(errorMessages).some(Boolean);
      };

      const updateUserProfile = async () => {
        if (!validateForm()) {
          alert('Por favor, corrija os erros antes de salvar.');
          return;
        }

        const userRef = doc(db, "users", userProfile.uid);
        try {
          await updateDoc(userRef, {
            fullName: userProfile.fullName,
            socialName: userProfile.socialName,
            gender: userProfile.gender,
            cpf: userProfile.cpf,
            emergencyContact: userProfile.emergencyContact

          });
          saveSuccess.value = true;
          setTimeout(() => {
            saveSuccess.value = false;
            editMode.value = false;
          }, 1000);
        } catch (error) {
          console.error("Falha ao atualizar o perfil:", error);
        }
      };

      return {
        userProfile,
        pets,
        editMode,
        showSection,
        saveSuccess,
        updateUserProfile,
        toggleEditMode,
        validateForm,
        errorMessages,
        isFormValid: computed(() => validateForm()),
        formattedEmergencyContact
      };
    }
  };
  </script>

  <style scoped>
  .profile-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .text-center {
    text-align: center;
  }

  .button-group {
    margin-bottom: 1rem;
  }

  .profile-view p {
    margin: 0.5rem 0;
    font-size: 1rem;
    color: #333;
  }

  .profile-edit input,
  .profile-edit select {
    width: 100%;
    padding: 0.375rem 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 0.25rem;
    margin-top: 0.5rem;
  }

  .error {
    color: red;
    font-size: 0.8em;
    margin-top: 5px;
  }

  .no-wrap {
    white-space: nowrap;
  }

  .btn-edit {
    background-color: #4CAF50; /* Green */
    color: rgb(255, 255, 255);
  }

  .btn-save {
    background-color: #4CAF50; /* Verde */
    color: white; /* Texto branco */
  }
  .btn-cancel {
    background-color: #f44336; /* Vermelho */
    color: white; /* Texto branco */
  }


  .btn-save, .btn-cancel {
    width: 100%; /* Garante que o botão ocupe todo o espaço da coluna */
    padding: 8px 12px; /* Ajuste conforme necessário */
    font-size: 14px; /* Menor para botões menores */
  }

  .btn {
    border: none;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    margin: 4px 2px;
    transition-duration: 0.4s;
    cursor: pointer;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }

  .btn:hover {
    box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
  }

  .alert {
    width: 100%; /* Assegura que o alerta também ocupe toda a largura */
  }

  </style>
