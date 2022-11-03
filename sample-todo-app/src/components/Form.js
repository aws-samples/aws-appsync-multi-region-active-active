import React from 'react';
import {
  TextField,
  SelectField,
  TextAreaField,
  Text,
  Heading
} from '@aws-amplify/ui-react';
import { addTodo } from '../graphql/mutations'
import { API } from 'aws-amplify'
import '@aws-amplify/ui-react/styles.css';


export const Form = (props) => {

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { target } = e;

    try {
      const { data } = await API.graphql({
        query: addTodo,
        variables: {
          input: {
            id: Math.floor(Math.random() * 10000),
            name: target.todoName.value,
            description: target.description.value,
            priority: parseInt(target.priority.value),
            status: target.status.value
          }
        },
        authToken: "custom-authorized"
      })

      props.setTodoData((curTodoData) => {
        return [...curTodoData, data.addTodo]

      })
      //to clean the input after submit
      target.todoName.value = ''
      target.description.value = ''
      target.priority.value = ''
      target.status.value = 'Select Status'
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <>
      <Heading level={3}>My Todos</Heading>
      <form onSubmit={handleSubmit}>

        <TextField
          label={<Text
            fontWeight='bold'
            fontSize='large'
          >
            Name
          </Text>}
          placeholder='Add a name'
          name='todoName'

          variation="primary"
        />
        <TextAreaField
          label={<Text
            fontWeight='bold'
            fontSize='large'
          >
            Description
          </Text>}
          placeholder='Add a description'
          name='description'

          variation="primary"
        />
        <SelectField label={<Text fontWeight='bold' fontSize='large'> Priority </Text>} name="priority" id="priority" >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </SelectField>
        <SelectField label={<Text fontWeight='bold' fontSize='large'> Status </Text>} name="status" id="status">
          <option value="none">Select status</option>
          <option value="done">Done</option>
          <option value="pending">Pending</option>
        </SelectField>
        <button className="button" >
          Add todos
        </button>
      </form >
    </>
  );
}

